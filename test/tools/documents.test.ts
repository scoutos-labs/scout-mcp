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

describe("scout_documents tool", () => {
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

  it("supports single-document CRUD", async () => {
    const client = await createClient();

    let fetchMock = mockScoutApi(jsonResponse({ items: [] }));
    await client.callTool({ name: "scout_documents", arguments: { action: "list", collection_id: "col_1", table_id: "tbl_1", params: { limit: 10 } } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections/col_1/tables/tbl_1/documents?limit=10");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "doc_1" }));
    await client.callTool({ name: "scout_documents", arguments: { action: "get", collection_id: "col_1", table_id: "tbl_1", document_id: "doc_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections/col_1/tables/tbl_1/documents/doc_1");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "doc_1" }));
    await client.callTool({ name: "scout_documents", arguments: { action: "create", collection_id: "col_1", table_id: "tbl_1", data: { title: "Doc" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("POST");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ id: "doc_1" }));
    await client.callTool({ name: "scout_documents", arguments: { action: "update", collection_id: "col_1", table_id: "tbl_1", document_id: "doc_1", data: { title: "Doc 2" } } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("PATCH");

    vi.restoreAllMocks();
    fetchMock = mockScoutApi(jsonResponse({ ok: true }));
    await client.callTool({ name: "scout_documents", arguments: { action: "delete", collection_id: "col_1", table_id: "tbl_1", document_id: "doc_1" } });
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].method).toBe("DELETE");

    await client.close();
  });

  it("sends batch updates correctly", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ updated: 2 }));
    const client = await createClient();
    const payload = [{ id: "doc_1", title: "One" }, { id: "doc_2", title: "Two" }];

    await client.callTool({ name: "scout_documents", arguments: { action: "update_batch", collection_id: "col_1", table_id: "tbl_1", data: payload } });

    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections/col_1/tables/tbl_1/documents/batch");
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].body).toBe(JSON.stringify(payload));

    await client.close();
  });

  it("sends batch deletes correctly", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ deleted: 2 }));
    const client = await createClient();
    const payload = ["doc_1", "doc_2"];

    await client.callTool({ name: "scout_documents", arguments: { action: "delete_batch", collection_id: "col_1", table_id: "tbl_1", data: payload } });

    expect((fetchMock.mock.calls.at(-1) as [URL])[0].toString()).toBe("https://api.scoutos.com/v2/collections/col_1/tables/tbl_1/documents/delete-batch");
    expect((fetchMock.mock.calls.at(-1) as [URL, RequestInit])[1].body).toBe(JSON.stringify(payload));

    await client.close();
  });
});
