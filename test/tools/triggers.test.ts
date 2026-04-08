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

describe("scout_triggers tool", () => {
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

  it("supports trigger CRUD", async () => {
    const client = await createClient();

    let fetchMock = mockScoutApi(jsonResponse({ items: [] }));
    await client.callTool({ name: "scout_triggers", arguments: { action: "list" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/triggers");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "trigger_1" }));
    await client.callTool({ name: "scout_triggers", arguments: { action: "create", data: { name: "Slack Trigger" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("POST");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "trigger_1" }));
    await client.callTool({ name: "scout_triggers", arguments: { action: "update", trigger_id: "trigger_1", data: { name: "Slack Trigger 2" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("PATCH");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_triggers", arguments: { action: "delete", trigger_id: "trigger_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("DELETE");

    await client.close();
  });

  it("executes Slack, Telegram, and cron trigger endpoints", async () => {
    const client = await createClient();

    let fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_triggers", arguments: { action: "execute_slack", trigger_id: "trigger_1", data: { text: "hi" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/triggers/trigger_1/execute-slack");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_triggers", arguments: { action: "execute_telegram", trigger_id: "trigger_1", data: { text: "hi" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/triggers/trigger_1/execute-telegram");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_triggers", arguments: { action: "execute_cron", trigger_id: "trigger_1", data: { text: "hi" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/triggers/trigger_1/execute-cron");

    await client.close();
  });

  it("updates cron auth headers", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    const client = await createClient();
    const payload = { authorization: "Bearer token" };

    await client.callTool({ name: "scout_triggers", arguments: { action: "update_cron_auth_headers", trigger_id: "trigger_1", data: payload } });

    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/triggers/trigger_1/cron-auth-headers");
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].body).toBe(JSON.stringify(payload));

    await client.close();
  });
});
