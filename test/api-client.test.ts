import { afterEach, describe, expect, it, vi } from "vitest";

import { ScoutApiClient, ScoutApiError } from "../src/api-client.js";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    statusText: init?.statusText
  });
}

describe("ScoutApiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets Authorization Bearer header on every request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: true }));

    const client = new ScoutApiClient("secret-key", "https://api.scoutos.com");
    await client.get("/v2/workflows");

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get("authorization")).toBe("Bearer secret-key");
  });

  it("throws a structured error on 4xx and 5xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          message: "Nope",
          detail: "Request failed"
        },
        { status: 404, statusText: "Not Found" }
      )
    );

    const client = new ScoutApiClient("secret-key");

    await expect(client.get("/v2/workflows/missing")).rejects.toEqual(
      expect.objectContaining<ScoutApiError>({
        name: "ScoutApiError",
        status: 404,
        message: "Nope",
        body: {
          message: "Nope",
          detail: "Request failed"
        }
      })
    );
  });

  it("serializes query params correctly for GET requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ items: [] }));

    const client = new ScoutApiClient("secret-key", "https://api.scoutos.com");
    await client.get("/v2/workflows", {
      search: "hello world",
      limit: 20,
      active: true,
      ignored: undefined
    });

    const [url] = fetchMock.mock.calls[0] as [URL, RequestInit];

    expect(url.toString()).toBe(
      "https://api.scoutos.com/v2/workflows?search=hello+world&limit=20&active=true"
    );
  });

  it.each(["POST", "PUT", "PATCH"])(
    "sends JSON bodies with the correct content-type for %s",
    async (method) => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: true }));

      const client = new ScoutApiClient("secret-key", "https://api.scoutos.com");
      const payload = { name: "Scout" };

      if (method === "POST") {
        await client.post("/v2/workflows", payload);
      }

      if (method === "PUT") {
        await client.put("/v2/workflows/123", payload);
      }

      if (method === "PATCH") {
        await client.patch("/v2/workflows/123", payload);
      }

      const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
      const headers = new Headers(init.headers);

      expect(init.method).toBe(method);
      expect(headers.get("content-type")).toBe("application/json");
      expect(init.body).toBe(JSON.stringify(payload));
    }
  );

  it("auto-paginates with listAll until next_cursor is exhausted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: "one" }],
          next_cursor: "page-2"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: "two" }],
          next_cursor: null
        })
      );

    vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);

    const client = new ScoutApiClient("secret-key", "https://api.scoutos.com");
    const result = await client.listAll<{ id: string }>("/v2/workflows", { limit: 1 });

    const [firstUrl] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const [secondUrl] = fetchMock.mock.calls[1] as [URL, RequestInit];

    expect(firstUrl.toString()).toBe("https://api.scoutos.com/v2/workflows?limit=1");
    expect(secondUrl.toString()).toBe(
      "https://api.scoutos.com/v2/workflows?limit=1&cursor=page-2"
    );
    expect(result).toEqual([{ id: "one" }, { id: "two" }]);
  });

  it("returns the raw fetch Response when requested", async () => {
    const response = new Response("event: message\ndata: hi\n\n", {
      status: 200,
      headers: {
        "content-type": "text/event-stream"
      }
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    const client = new ScoutApiClient("secret-key", "https://api.scoutos.com");
    const result = await client.request("/agents/interact", {
      method: "POST",
      body: { prompt: "hello" },
      rawResponse: true
    });

    expect(result).toBe(response);
  });
});
