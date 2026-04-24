import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScoutApiClient } from "../api-client.js";

export function registerScoutRunWorkflowPrompt(
  server: McpServer,
  _client: ScoutApiClient
) {
  server.registerPrompt(
    "scout_run_workflow",
    {
      description: "I want to run a workflow."
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "I want to run a workflow."
            }
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: [
                "Let's get that workflow running. Follow these steps:",
                "",
                "### Step 1: Find your workflow",
                "",
                "Use **scout_workflows** with action `list` to see all your workflows.",
                "If you already know the workflow ID, skip to Step 2.",
                "",
                "### Step 2: Confirm the workflow",
                "",
                "Use **scout_workflows** with action `get` and the `workflow_id` to review its configuration.",
                "Check that the steps and settings look correct before running.",
                "",
                "### Step 3: Run it",
                "",
                "- For a standard run, use **scout_workflows** with action `run` and the `workflow_id`.",
                "- If you need to override input values or step parameters at runtime, use action `run_with_config` instead, passing the overrides in the `data` field.",
                "",
                "### Step 4: Check the results",
                "",
                "Use **scout_logs** with action `list` to see recent run logs, then action `get_details` with the log ID to inspect step-level results, errors, and timing.",
                "",
                "If the workflow failed, use the **scout_debug_logs** prompt for a guided debugging workflow."
              ].join("\n")
            }
          }
        ]
      };
    }
  );
}