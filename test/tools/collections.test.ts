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

describe("scout_collections tool", () => {
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

  it("supports collection CRUD operations", async () => {
    const client = await createClient();

    let fetchMock = mockScoutApi(jsonResponse({ items: [] }));
    await client.callTool({ name: "scout_collections", arguments: { action: "list" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "col_1" }));
    await client.callTool({ name: "scout_collections", arguments: { action: "get", collection_id: "col_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections/col_1");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "col_1" }));
    await client.callTool({ name: "scout_collections", arguments: { action: "create", data: { name: "Docs" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("POST");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "col_1" }));
    await client.callTool({ name: "scout_collections", arguments: { action: "update", collection_id: "col_1", data: { name: "Docs 2" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("PATCH");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_collections", arguments: { action: "delete", collection_id: "col_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("DELETE");

    await client.close();
  });

  it("supports collection view actions", async () => {
    const client = await createClient();

    let fetchMock = mockScoutApi(jsonResponse({ items: [] }));
    await client.callTool({ name: "scout_collections", arguments: { action: "list_views", collection_id: "col_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections/col_1/views");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "view_1" }));
    await client.callTool({ name: "scout_collections", arguments: { action: "create_view", collection_id: "col_1", data: { name: "All" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("POST");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "view_1" }));
    await client.callTool({ name: "scout_collections", arguments: { action: "update_view", collection_id: "col_1", view_id: "view_1", data: { name: "Recent" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections/col_1/views/view_1");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_collections", arguments: { action: "delete_view", collection_id: "col_1", view_id: "view_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("DELETE");

    await client.close();
  });
});
