import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/index.js";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function mockScoutApi(routeMap: Record<string, Response>) {
  const originalFetch = globalThis.fetch;

  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = input instanceof Request ? input.url : input.toString();

    if (url in routeMap) {
      return Promise.resolve(routeMap[url]);
    }

    return originalFetch(input, init);
  });
}

describe("MCP resources", () => {
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

  it("resources/list returns 3 resources", async () => {
    const client = await createClient();
    const result = await client.listResources();

    expect(result.resources).toHaveLength(3);
    expect(result.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining(["scout://workflows", "scout://collections", "scout://agents"])
    );

    await client.close();
  });

  it("reads scout://workflows", async () => {
    mockScoutApi({
      "https://api.scoutos.com/v2/workflows": jsonResponse({ items: [{ id: "wf_1" }] })
    });

    const client = await createClient();
    const result = await client.readResource({ uri: "scout://workflows" });

    expect(result.contents[0]).toMatchObject({ uri: "scout://workflows" });
    expect("text" in result.contents[0] ? result.contents[0].text : "").toContain("wf_1");

    await client.close();
  });

  it("reads scout://collections", async () => {
    mockScoutApi({
      "https://api.scoutos.com/v2/collections": jsonResponse({ items: [{ id: "col_1" }] })
    });

    const client = await createClient();
    const result = await client.readResource({ uri: "scout://collections" });

    expect("text" in result.contents[0] ? result.contents[0].text : "").toContain("col_1");

    await client.close();
  });

  it("reads scout://agents", async () => {
    mockScoutApi({
      "https://api.scoutos.com/agents": jsonResponse({ items: [{ id: "agent_1" }] })
    });

    const client = await createClient();
    const result = await client.readResource({ uri: "scout://agents" });

    expect("text" in result.contents[0] ? result.contents[0].text : "").toContain("agent_1");

    await client.close();
  });
});
