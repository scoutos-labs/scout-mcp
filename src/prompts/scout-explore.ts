import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScoutApiClient } from "../api-client.js";

interface ApiListItem {
  id?: string;
  name?: string;
  title?: string;
}

interface PaginatedResponse {
  items?: ApiListItem[];
  data?: ApiListItem[];
}

function extractNames(page: PaginatedResponse | unknown): string[] {
  if (!page || typeof page !== "object") return [];
  const obj = page as PaginatedResponse;
  const list = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.data) ? obj.data : [];
  return list.map((item) => item.name || item.title || item.id || "unnamed").filter(Boolean);
}

export async function registerScoutExplorePrompt(
  server: McpServer,
  client: ScoutApiClient
) {
  server.registerPrompt(
    "scout_explore",
    {
      description: "I'm new to Scout. Show me what I have."
    },
    async () => {
      let workflowNames: string[] = [];
      let agentNames: string[] = [];
      let collectionNames: string[] = [];

      try {
        const workflows = await client.get("/v2/workflows");
        workflowNames = extractNames(workflows);
      } catch {
        workflowNames = [];
      }

      try {
        const agents = await client.get("/agents");
        agentNames = extractNames(agents);
      } catch {
        agentNames = [];
      }

      try {
        const collections = await client.get("/v2/collections");
        collectionNames = extractNames(collections);
      } catch {
        collectionNames = [];
      }

      const workflowSection = workflowNames.length > 0
        ? `Your workflows:\n${workflowNames.map((n) => `  - ${n}`).join("\n")}`
        : "No workflows found. You can create one with scout_workflows action 'create'.";

      const agentSection = agentNames.length > 0
        ? `Your agents:\n${agentNames.map((n) => `  - ${n}`).join("\n")}`
        : "No agents found. You can create one with scout_agents action 'upsert'.";

      const collectionSection = collectionNames.length > 0
        ? `Your collections:\n${collectionNames.map((n) => `  - ${n}`).join("\n")}`
        : "No collections found. You can create one with scout_collections action 'create'.";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "I'm new to Scout. Show me what I have."
            }
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: [
                "Welcome to Scout! Let me give you an overview of your account.",
                "",
                "## Your Scout Account Overview",
                "",
                workflowSection,
                "",
                agentSection,
                "",
                collectionSection,
                "",
                "## Next Steps",
                "",
                "Here's what you can do from here:",
                "",
                "1. **Explore a workflow** — Use scout_workflows with action 'get' and a workflow_id to see details and steps.",
                "2. **Run a workflow** — Use scout_workflows with action 'run' and a workflow_id to execute it, then check results with scout_logs.",
                "3. **Chat with an agent** — Use scout_agents with action 'interact' and an agent_id to send a message.",
                "4. **Browse collection data** — Use scout_collections with action 'get' and a collection_id, then scout_tables and scout_documents to explore.",
                "5. **Sync external data** — Use scout_syncs with action 'list_sources' to see available data sources, then 'create' to set up a sync.",
                "",
                "Use the **scout_explore** prompt anytime you want a fresh overview of your account."
              ].join("\n")
            }
          }
        ]
      };
    }
  );
}