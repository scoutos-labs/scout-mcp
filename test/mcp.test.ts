import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/index.js";

describe("MCP server", () => {
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

  it("returns initialize capabilities", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": LATEST_PROTOCOL_VERSION
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: "vitest-client",
            version: "0.1.0"
          }
        }
      })
    });

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {
          tools: {},
          resources: {}
        },
        serverInfo: {
          name: "scout-os-mcp-server",
          version: "0.1.0"
        }
      }
    });
  });

  it("lists no tools", async () => {
    const client = new Client({ name: "vitest-client", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));

    await client.connect(transport);

    await expect(client.listTools()).resolves.toMatchObject({ tools: [] });

    await client.close();
  });

  it("lists no resources", async () => {
    const client = new Client({ name: "vitest-client", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));

    await client.connect(transport);

    await expect(client.listResources()).resolves.toMatchObject({ resources: [] });

    await client.close();
  });

  it("returns an error for an unrecognized method", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": LATEST_PROTOCOL_VERSION
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "made_up_method",
        params: {}
      })
    });

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 2,
      error: {
        code: -32601,
        message: expect.stringContaining("not found")
      }
    });
  });
});
