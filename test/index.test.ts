import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { createApp } from "../src/index.js";

describe("GET /health", () => {
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

  it("responds with ok true", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
