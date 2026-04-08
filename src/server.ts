import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ScoutApiClient } from "./api-client.js";
import { registerAgentsTool, registerAgentSessionsTool } from "./tools/agents.js";
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

  return server;
}
