import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

import { ScoutApiClient, ScoutApiError } from "./api-client.js";
import { registerResources } from "./resources/index.js";
import {
  registerScoutExplorePrompt,
  registerScoutRunWorkflowPrompt,
  registerScoutDebugLogsPrompt,
  registerScoutCreateAgentPrompt,
  registerScoutSyncDataPrompt,
} from "./prompts/index.js";
import { registerAgentsTool, registerAgentSessionsTool } from "./tools/agents.js";
import { registerCollectionsTool } from "./tools/collections.js";
import { registerCopilotsTool } from "./tools/copilots.js";
import { registerDriveTool } from "./tools/drive.js";
import { registerDocumentsTool } from "./tools/documents.js";
import { registerIntegrationsTool } from "./tools/integrations.js";
import { registerLogsTool } from "./tools/logs.js";
import { registerSyncsTool } from "./tools/syncs.js";
import { registerTriggersTool } from "./tools/triggers.js";
import { registerTablesTool } from "./tools/tables.js";
import { registerUsageTool } from "./tools/usage.js";
import { registerWorkflowsTool } from "./tools/workflows.js";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export function createMcpServer(apiClient = new ScoutApiClient(process.env.SCOUT_API_KEY ?? "")) {
  const server = new McpServer(
    {
      name: "scout-os-mcp-server",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );

  // Register disabled placeholders so the SDK exposes empty list handlers
  // before real tools and resources are added in later steps.
  server
    .registerTool(
      "_placeholder",
      {
        description: "Internal placeholder",
        inputSchema: { _placeholder: z.string().optional() }
      },
      async (_input: any) => ({ content: [] })
    )
    .disable();

  server
    .registerResource(
      "_placeholder",
      "scout://internal-placeholder",
      {
        mimeType: "text/plain"
      },
      async () => ({
        contents: [
          {
            uri: "scout://internal-placeholder",
            text: "placeholder"
          }
        ]
      })
    )
    .disable();

  registerTool(server, registerWorkflowsTool(apiClient));
  registerTool(server, registerAgentsTool(apiClient));
  registerTool(server, registerAgentSessionsTool(apiClient));
  registerTool(server, registerCollectionsTool(apiClient));
  registerTool(server, registerTablesTool(apiClient));
  registerTool(server, registerDocumentsTool(apiClient));
  registerTool(server, registerSyncsTool(apiClient));
  registerTool(server, registerTriggersTool(apiClient));
  registerTool(server, registerCopilotsTool(apiClient));
  registerTool(server, registerLogsTool(apiClient));
  registerTool(server, registerIntegrationsTool(apiClient));
  registerTool(server, registerDriveTool(apiClient));
  registerTool(server, registerUsageTool(apiClient));

  registerResources(server, apiClient);

  // Register prompts
  registerScoutExplorePrompt(server, apiClient);
  registerScoutRunWorkflowPrompt(server, apiClient);
  registerScoutDebugLogsPrompt(server, apiClient);
  registerScoutCreateAgentPrompt(server, apiClient);
  registerScoutSyncDataPrompt(server, apiClient);

  return server;
}

function registerTool(
  server: McpServer,
  tool: {
    name: string;
    config: any;
    handler: (input: any, extra: any) => Promise<any>;
  }
) {
  (server as any).registerTool(tool.name, tool.config, async (input: any, extra: any) => {
    try {
      return await tool.handler(input, extra);
    } catch (error) {
      throw toMcpError(error);
    }
  });
}

function toMcpError(error: unknown) {
  if (error instanceof McpError) {
    return error;
  }

  if (error instanceof ScoutApiError) {
    if (error.status === 401) {
      return new McpError(ErrorCode.InvalidRequest, `Unauthorized: ${error.message}`, error.body);
    }

    if (error.status === 404) {
      return new McpError(ErrorCode.InvalidRequest, `Resource not found: ${error.message}`, error.body);
    }

    if (error.status >= 500) {
      return new McpError(ErrorCode.InternalError, `Scout API internal error: ${error.message}`, error.body);
    }

    return new McpError(ErrorCode.InvalidRequest, error.message, error.body);
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new McpError(ErrorCode.RequestTimeout, "Scout API request timed out");
  }

  if (error instanceof Error) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  return new McpError(ErrorCode.InternalError, "Unknown server error");
}