import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScoutApiClient } from "../api-client.js";

export function registerScoutSyncDataPrompt(
  server: McpServer,
  _client: ScoutApiClient
) {
  server.registerPrompt(
    "scout_sync_data",
    {
      description: "I need to sync data into Scout."
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "I need to sync data into Scout."
            }
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: [
                "Let's set up a data sync. Here's the workflow:",
                "",
                "### Step 1: Discover available sources",
                "",
                "Use **scout_syncs** with action `list_sources` to see which external data sources are available for sync (e.g., Google Sheets, Airtable, REST APIs, databases).",
                "",
                "### Step 2: Choose or create a target collection",
                "",
                "Use **scout_collections** with action `list` to see existing collections.",
                "If you need a new one, use action `create` with a name and settings.",
                "Then use **scout_tables** with action `list` (or `create`) to set up a table with the right schema for your incoming data.",
                "",
                "### Step 3: Create the sync",
                "",
                "Use **scout_syncs** with action `create` and include the following in the `data` field:",
                "",
                "```json",
                "{",
                '  "name": "my-sync-name",',
                '  "source": { /* source config from list_sources */ },',
                '  "target": {',
                '    "collection_id": "...",',
                '    "table_id": "..."',
                "  }",
                "}",
                "```",
                "",
                "Map source columns to target table columns in the sync configuration.",
                "",
                "### Step 4: Execute the sync",
                "",
                "Use **scout_syncs** with action `execute` and the sync's ID to run it immediately.",
                "This will pull data from the source and write it into the target table.",
                "",
                "### Step 5: Verify the data",
                "",
                "Use **scout_documents** with action `list` (providing `collection_id` and `table_id` via params) to confirm the synced data landed correctly.",
                "You can also use **scout_logs** with action `list` to check for any sync errors.",
                "",
                "### Step 6: Set up ongoing syncs (optional)",
                "",
                "If you want the sync to run on a schedule, use **scout_triggers** with action `create` and type `cron` to schedule recurring execution."
              ].join("\n")
            }
          }
        ]
      };
    }
  );
}