import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/index.js";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    statusText: init?.statusText,
    headers: { "content-type": "application/json" }
  });
}

function mockScoutApi(handler: (url: string) => Promise<Response> | Response) {
  const originalFetch = globalThis.fetch;

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();

    if (url.startsWith("https://api.scoutos.com")) {
      return handler(url);
    }

    return originalFetch(input, init);
  });
}

describe("integration flow and error handling", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    process.env.SCOUT_API_KEY = "test-api-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SCOUT_API_KEY;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  async function createClient() {
    const client = new Client({ name: "vitest-client", version: "0.1.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));
    return client;
  }

  it("supports initialize, list tools, and call tool end to end", async () => {
    mockScoutApi((url) => {
      if (url === "https://api.scoutos.com/v2/workflows") {
        return jsonResponse({ items: [{ id: "wf_1" }] });
      }

      return jsonResponse({ ok: true });
    });

    const client = await createClient();
    const tools = await client.listTools();
    const result = await client.callTool({
      name: "scout_workflows",
      arguments: { action: "list" }
    });

    expect(tools.tools.length).toBeGreaterThanOrEqual(13);
    expect((result.content as Array<{ text: string }>)[0].text).toContain("wf_1");

    await client.close();
  });

  it("maps API 404 errors to MCP errors with a helpful message", async () => {
    mockScoutApi(() => jsonResponse({ message: "Workflow missing" }, { status: 404, statusText: "Not Found" }));

    const client = await createClient();

    const result = await client.callTool({
      name: "scout_workflows",
      arguments: { action: "get", workflow_id: "missing" }
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain("Resource not found");

    await client.close();
  });

  it("maps API 401 errors to MCP auth-style errors", async () => {
    mockScoutApi(() => jsonResponse({ message: "Invalid API key" }, { status: 401, statusText: "Unauthorized" }));

    const client = await createClient();

    const result = await client.callTool({
      name: "scout_workflows",
      arguments: { action: "list" }
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain("Unauthorized");

    await client.close();
  });

  it("maps API 500 errors to MCP internal errors", async () => {
    mockScoutApi(() => jsonResponse({ message: "Server exploded" }, { status: 500, statusText: "Internal Server Error" }));

    const client = await createClient();

    const result = await client.callTool({
      name: "scout_workflows",
      arguments: { action: "list" }
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain("internal error");

    await client.close();
  });

  it("maps network timeouts to MCP timeout errors", async () => {
    mockScoutApi(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });

    const client = await createClient();

    const result = await client.callTool({
      name: "scout_workflows",
      arguments: { action: "list" }
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain("timed out");

    await client.close();
  });

  it("handles concurrent tool calls", async () => {
    mockScoutApi(async (url) => {
      if (url === "https://api.scoutos.com/v2/workflows") {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return jsonResponse({ items: [{ id: "wf_1" }] });
      }

      if (url === "https://api.scoutos.com/v2/usage") {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return jsonResponse({ tokens: 42 });
      }

      return jsonResponse({ ok: true });
    });

    const client = await createClient();
    const [workflows, usage] = await Promise.all([
      client.callTool({ name: "scout_workflows", arguments: { action: "list" } }),
      client.callTool({ name: "scout_usage", arguments: { action: "get" } })
    ]);

    expect((workflows.content as Array<{ text: string }>)[0].text).toContain("wf_1");
    expect((usage.content as Array<{ text: string }>)[0].text).toContain("42");

    await client.close();
  });
});
