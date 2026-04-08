import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ScoutApiClient } from "./api-client.js";
import { registerResources } from "./resources/index.js";
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

export function createMcpServer(apiClient = new ScoutApiClient(process.env.SCOUT_API_KEY ?? "")) {
  const server = new McpServer(
    {
      name: "scout-os-mcp-server",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  // Register disabled placeholders so the SDK exposes empty list handlers
  // before real tools and resources are added in later steps.
  server
    .registerTool(
      "_placeholder",
      {
        description: "Internal placeholder"
      },
      async () => ({ content: [] })
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

  const workflowsTool = registerWorkflowsTool(apiClient);
  server.registerTool(workflowsTool.name, workflowsTool.config, workflowsTool.handler);

  const agentsTool = registerAgentsTool(apiClient);
  server.registerTool(agentsTool.name, agentsTool.config, agentsTool.handler);

  const agentSessionsTool = registerAgentSessionsTool(apiClient);
  server.registerTool(agentSessionsTool.name, agentSessionsTool.config, agentSessionsTool.handler);

  const collectionsTool = registerCollectionsTool(apiClient);
  server.registerTool(collectionsTool.name, collectionsTool.config, collectionsTool.handler);

  const tablesTool = registerTablesTool(apiClient);
  server.registerTool(tablesTool.name, tablesTool.config, tablesTool.handler);

  const documentsTool = registerDocumentsTool(apiClient);
  server.registerTool(documentsTool.name, documentsTool.config, documentsTool.handler);

  const syncsTool = registerSyncsTool(apiClient);
  server.registerTool(syncsTool.name, syncsTool.config, syncsTool.handler);

  const triggersTool = registerTriggersTool(apiClient);
  server.registerTool(triggersTool.name, triggersTool.config, triggersTool.handler);

  const copilotsTool = registerCopilotsTool(apiClient);
  server.registerTool(copilotsTool.name, copilotsTool.config, copilotsTool.handler);

  const logsTool = registerLogsTool(apiClient);
  server.registerTool(logsTool.name, logsTool.config, logsTool.handler);

  const integrationsTool = registerIntegrationsTool(apiClient);
  server.registerTool(integrationsTool.name, integrationsTool.config, integrationsTool.handler);

  const driveTool = registerDriveTool(apiClient);
  server.registerTool(driveTool.name, driveTool.config, driveTool.handler);

  const usageTool = registerUsageTool(apiClient);
  server.registerTool(usageTool.name, usageTool.config, usageTool.handler);

  registerResources(server, apiClient);

  return server;
}
