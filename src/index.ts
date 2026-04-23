import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { type Express, type Request, type Response, type NextFunction } from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createMcpServer } from "./server.js";

function getOptionalBearerToken() {
  return process.env.MCP_SERVER_BEARER_TOKEN;
}

function requireBearerAuth(request: Request, response: Response, next: NextFunction) {
  const expectedToken = getOptionalBearerToken();

  if (!expectedToken) {
    next();
    return;
  }

  const authorization = request.header("authorization");

  if (authorization === `Bearer ${expectedToken}`) {
    next();
    return;
  }

  response.status(401).json({ error: "Unauthorized" });
}

async function handleMcpRequest(request: Request, response: Response) {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal server error"
        },
        id: null
      });
    }
  } finally {
    await transport.close();
    await server.close();
  }
}

function methodNotAllowed(response: Response) {
  response.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  });
}

export function createApp(): Express {
  const app = createMcpExpressApp();

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/mcp", requireBearerAuth);
  app.get("/mcp", (_request, response) => {
    methodNotAllowed(response);
  });
  app.post("/mcp", async (request, response) => {
    await handleMcpRequest(request, response);
  });
  app.delete("/mcp", (_request, response) => {
    methodNotAllowed(response);
  });

  return app;
}

export function startServer(
  port = Number(process.env.PORT ?? 9987),
  host = process.env.HOST ?? "127.0.0.1"
) {
  const app = createApp();

  return app.listen(port, host, () => {
    console.log(`Scout MCP server listening at http://${host}:${port}/mcp`);
  });
}

function isMainModule() {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  startServer();
}
