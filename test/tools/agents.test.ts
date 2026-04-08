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

function sseResponse(body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream"
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

describe("scout_agents tools", () => {
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

  it("action list returns agents", async () => {
    mockScoutApi(jsonResponse({ items: [{ id: "agent_1" }] }));

    const client = await createClient();
    const result = await client.callTool({
      name: "scout_agents",
      arguments: { action: "list" }
    });

    expect(result.isError).toBeUndefined();
    expect((result.content as Array<{ text: string }>)[0].text).toContain("agent_1");

    await client.close();
  });

  it("action interact streams SSE response as text content", async () => {
    mockScoutApi(
      sseResponse('data: {"text":"Hello"}\n\ndata: {"text":" world"}\n\n')
    );

    const client = await createClient();
    const result = await client.callTool({
      name: "scout_agents",
      arguments: {
        action: "interact",
        agent_id: "agent_1",
        data: { prompt: "hi" }
      }
    });

    expect((result.content as Array<{ text: string }>)[0].text).toBe("Hello world");

    await client.close();
  });

  it("action interact_sync returns synchronous response", async () => {
    mockScoutApi(jsonResponse({ reply: "Hello sync" }));

    const client = await createClient();
    const result = await client.callTool({
      name: "scout_agents",
      arguments: {
        action: "interact_sync",
        agent_id: "agent_1",
        data: { prompt: "hi" }
      }
    });

    expect((result.content as Array<{ text: string }>)[0].text).toContain("Hello sync");

    await client.close();
  });

  it("action upsert creates or updates an agent", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ id: "agent_1" }));

    const client = await createClient();
    const payload = { name: "Scout Agent" };

    await client.callTool({
      name: "scout_agents",
      arguments: {
        action: "upsert",
        data: payload
      }
    });

    const [url, init] = fetchMock.mock.calls.find(([input]) =>
      input.toString().startsWith("https://api.scoutos.com")
    ) as [URL, RequestInit];

    expect(url.toString()).toBe("https://api.scoutos.com/agents/upsert");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(payload));

    await client.close();
  });

  it("session interactions include session_id in the request body", async () => {
    const fetchMock = mockScoutApi(jsonResponse({ reply: "ok" }));

    const client = await createClient();
    await client.callTool({
      name: "scout_agent_sessions",
      arguments: {
        action: "interact_with_session",
        agent_id: "agent_1",
        session_id: "session_123",
        data: { prompt: "hi" }
      }
    });

    const [, init] = fetchMock.mock.calls.find(([input]) =>
      input.toString().startsWith("https://api.scoutos.com")
    ) as [URL, RequestInit];

    expect(init.body).toBe(JSON.stringify({ prompt: "hi", session_id: "session_123" }));

    await client.close();
  });
});
