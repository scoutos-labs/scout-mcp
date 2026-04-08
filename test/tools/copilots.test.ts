import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/index.js";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
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

describe("Step 9 tools", () => {
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

  it("supports copilot CRUD", async () => {
    const client = await createClient();

    let fetchMock = mockScoutApi(jsonResponse({ items: [] }));
    await client.callTool({ name: "scout_copilots", arguments: { action: "list" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/copilots");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "copilot_1" }));
    await client.callTool({ name: "scout_copilots", arguments: { action: "get", copilot_id: "copilot_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/copilots/copilot_1");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "copilot_1" }));
    await client.callTool({ name: "scout_copilots", arguments: { action: "create", data: { name: "Copilot" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("POST");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "copilot_1" }));
    await client.callTool({ name: "scout_copilots", arguments: { action: "update", copilot_id: "copilot_1", data: { name: "Copilot 2" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("PATCH");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_copilots", arguments: { action: "delete", copilot_id: "copilot_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("DELETE");

    await client.close();
  });

  it("supports logs, integrations, drive, and usage endpoints", async () => {
    const client = await createClient();

    let fetchMock = mockScoutApi(jsonResponse({ items: [] }));
    await client.callTool({ name: "scout_logs", arguments: { action: "list" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/run_logs");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "log_1" }));
    await client.callTool({ name: "scout_logs", arguments: { action: "get_details", log_id: "log_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/run_logs/log_1");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ items: [] }));
    await client.callTool({ name: "scout_integrations", arguments: { action: "list" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/integrations");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ channels: [] }));
    await client.callTool({ name: "scout_integrations", arguments: { action: "list_channels" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/integrations/slack/channels");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_integrations", arguments: { action: "delete_integration", integration_id: "int_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("DELETE");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "file_1" }));
    await client.callTool({ name: "scout_drive", arguments: { action: "upload", data: { name: "file.txt", content: "abc" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/drive/upload");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(new Response("file-content", { status: 200 }));
    const download = await client.callTool({ name: "scout_drive", arguments: { action: "download", file_id: "file_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/drive/file_1/download");
    expect((download.content as Array<{ text: string }>)[0].text).toBe("file-content");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ tokens: 123 }));
    await client.callTool({ name: "scout_usage", arguments: { action: "get" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/usage");

    await client.close();
  });

  it("lists all 13 tools", async () => {
    const client = await createClient();
    const result = await client.listTools();

    expect(result.tools).toHaveLength(13);
    expect(result.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "scout_workflows",
        "scout_agents",
        "scout_agent_sessions",
        "scout_collections",
        "scout_tables",
        "scout_documents",
        "scout_syncs",
        "scout_triggers",
        "scout_copilots",
        "scout_logs",
        "scout_integrations",
        "scout_drive",
        "scout_usage"
      ])
    );

    await client.close();
  });
});
