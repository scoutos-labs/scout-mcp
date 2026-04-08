import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createMcpServer() {
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

  return server;
}
