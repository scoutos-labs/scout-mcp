import { ScoutApiClient } from "../api-client.js";

function asTextResource(uri: string, data: unknown) {
  return {
    contents: [
      {
        uri,
        text: JSON.stringify(data, null, 2),
        mimeType: "application/json"
      }
    ]
  };
}

export function registerResources(server: {
  registerResource: typeof import("@modelcontextprotocol/sdk/server/mcp.js").McpServer.prototype.registerResource;
}, client: ScoutApiClient) {
  server.registerResource(
    "scout_workflows_resource",
    "scout://workflows",
    {
      description: "Current Scout workflows",
      mimeType: "application/json"
    },
    async () => asTextResource("scout://workflows", await client.get("/v2/workflows"))
  );

  server.registerResource(
    "scout_collections_resource",
    "scout://collections",
    {
      description: "Current Scout collections",
      mimeType: "application/json"
    },
    async () => asTextResource("scout://collections", await client.get("/v2/collections"))
  );

  server.registerResource(
    "scout_agents_resource",
    "scout://agents",
    {
      description: "Current Scout agents",
      mimeType: "application/json"
    },
    async () => asTextResource("scout://agents", await client.get("/agents"))
  );
}
