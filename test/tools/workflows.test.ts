import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/index.js";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

function mockScoutApi(response: Response) {
  const originalFetch = globalThis.fetch;

  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = input instanceof Request ? input.url : input.toString();

    if (url.startsWith("https://api.scoutos.com")) {
      return Promise.resolve(response);
    }

    return originalFetch(input, init);
  });
}

describe("scout_workflows tool", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createApp().listen(0);

    await new Promise<void>((resolve) => {
      server.once("listening", () => resolve());
    });

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
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  async function createClient() {
    const client = new Client({ name: "vitest-client", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));

    await client.connect(transport);

    return client;
  }

  it("includes scout_workflows in tools/list", async () => {
    const client = await createClient();

    const result = await client.listTools();
    const tool = result.tools.find((entry) => entry.name === "scout_workflows");

    expect(tool).toMatchObject({
      name: "scout_workflows",
      description: "Manage Scout workflows"
    });
    expect(tool?.inputSchema.properties).toHaveProperty("action");

    await client.close();
  });

  it("with action list calls GET /v2/workflows", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ items: [{ id: "wf_1" }] }));

    const client = await createClient();
    const result = await client.callTool({
      name: "scout_workflows",
      arguments: { action: "list" }
    });

    const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit];

    expect(url.toString()).toBe("https://api.scoutos.com/v2/workflows");
    expect(init.method).toBe("GET");
    expect(result.isError).toBeUndefined();

    await client.close();
  });

  it("with action get calls GET /v2/workflows/:id", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ id: "wf_123" }));

    const client = await createClient();

    await client.callTool({
      name: "scout_workflows",
      arguments: { action: "get", workflow_id: "wf_123" }
    });

    const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit];

    expect(url.toString()).toBe("https://api.scoutos.com/v2/workflows/wf_123");
    expect(init.method).toBe("GET");

    await client.close();
  });

  it("with action create sends POST with the correct body", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ id: "wf_123" }));

    const client = await createClient();
    const payload = { name: "Workflow" };

    await client.callTool({
      name: "scout_workflows",
      arguments: { action: "create", data: payload }
    });

    const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit];

    expect(url.toString()).toBe("https://api.scoutos.com/v2/workflows");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(payload));

    await client.close();
  });

  it("with action run calls POST /v2/workflows/:id/run", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ status: "queued" }));

    const client = await createClient();

    await client.callTool({
      name: "scout_workflows",
      arguments: { action: "run", workflow_id: "wf_123" }
    });

    const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit];

    expect(url.toString()).toBe("https://api.scoutos.com/v2/workflows/wf_123/run");
    expect(init.method).toBe("POST");

    await client.close();
  });

  it("with action run_with_config calls POST /v2/workflows/:id/run-with-config", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ status: "queued" }));

    const client = await createClient();
    const payload = { inputs: { city: "Berlin" } };

    await client.callTool({
      name: "scout_workflows",
      arguments: {
        action: "run_with_config",
        workflow_id: "wf_123",
        data: payload
      }
    });

    const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit];

    expect(url.toString()).toBe("https://api.scoutos.com/v2/workflows/wf_123/run-with-config");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(payload));

    await client.close();
  });

  it("returns an MCP error for invalid actions", async () => {
    const client = await createClient();
    const result = (await client.callTool({
      name: "scout_workflows",
      arguments: { action: "invalid_action" }
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("Invalid enum value")
    });

    await client.close();
  });

  it("returns validation errors for missing required params", async () => {
    const client = await createClient();
    const result = (await client.callTool({
      name: "scout_workflows",
      arguments: { action: "get" }
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("workflow_id")
    });

    await client.close();
  });
});
