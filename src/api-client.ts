type Primitive = string | number | boolean;

export class ScoutApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "ScoutApiError";
  }
}

type QueryValue = Primitive | null | undefined;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, QueryValue>;
  body?: unknown;
  headers?: HeadersInit;
  rawResponse?: boolean;
};

type PaginatedList<T> = {
  items?: T[];
  data?: T[];
  next_cursor?: string | null;
};

export class ScoutApiClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.scoutos.com",
    private readonly timeoutMs = 30_000
  ) {}

  async get<T>(path: string, params?: Record<string, QueryValue>) {
    return this.request<T>(path, { method: "GET", params });
  }

  async post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body });
  }

  async put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PUT", body });
  }

  async patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PATCH", body });
  }

  async delete<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "DELETE", body });
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T | Response> {
    const method = options.method ?? "GET";
    const url = this.buildUrl(path, options.params);
    const headers = new Headers(options.headers);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    headers.set("authorization", `Bearer ${this.apiKey}`);
    headers.set("accept", "application/json");

    let body: BodyInit | undefined;

    if (typeof options.body !== "undefined") {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      if (!response.ok) {
        throw await this.toError(response);
      }

      if (options.rawResponse) {
        return response;
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async listAll<T>(path: string, params: Record<string, QueryValue> = {}) {
    const items: T[] = [];
    let cursor: string | null | undefined;

    do {
      const page = (await this.get<PaginatedList<T>>(path, {
        ...params,
        cursor
      })) as PaginatedList<T>;

      items.push(...this.extractItems(page));
      cursor = page.next_cursor;
    } while (cursor);

    return items;
  }

  private buildUrl(path: string, params?: Record<string, QueryValue>) {
    const url = new URL(path, this.baseUrl);

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === null || typeof value === "undefined") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url;
  }

  private extractItems<T>(page: PaginatedList<T>) {
    if (Array.isArray(page.items)) {
      return page.items;
    }

    if (Array.isArray(page.data)) {
      return page.data;
    }

    return [];
  }

  private async toError(response: Response) {
    const text = await response.text();
    const body = this.parseBody(text);
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : response.statusText || `Scout API request failed with status ${response.status}`;

    return new ScoutApiError(response.status, message, body);
  }

  private parseBody(text: string) {
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
