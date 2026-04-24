import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScoutApiClient } from "../api-client.js";

export function registerScoutDebugLogsPrompt(
  server: McpServer,
  _client: ScoutApiClient
) {
  server.registerPrompt(
    "scout_debug_logs",
    {
      description: "Something went wrong."
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Something went wrong."
            }
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: [
                "Let's diagnose the issue. Follow these steps:",
                "",
                "### Step 1: Pull recent failed logs",
                "",
                "Use **scout_logs** with action `list` to see recent run logs.",
                "Look for entries with a failed or error status.",
                "",
                "### Step 2: Get the full details",
                "",
                "Once you've identified a failed run, use **scout_logs** with action `get_details` and the log ID.",
                "This returns the complete execution trace, including:",
                "- Which steps ran and which ones failed",
                "- Error messages and stack traces",
                "- Input/output data for each step",
                "- Timing information",
                "",
                "### Step 3: Trace the workflow",
                "",
                "If the log references a workflow_id, use **scout_workflows** with action `get` and that ID to review the workflow definition.",
                "Compare the workflow's expected configuration against the log data to spot mismatches.",
                "",
                "### Step 4: Common failure patterns",
                "",
                "- **Missing input data** — The workflow was run without required configuration. Use `run_with_config` to supply it.",
                "- **Authentication errors** — An integration or API key may have expired. Check **scout_integrations** with action `list`.",
                "- **Step timeout** — A step took too long. Review the step configuration in the workflow.",
                "- **Bad mapping** — A data sync or transformation step had a schema mismatch. Check the table with **scout_tables** action `get_schema`.",
                "",
                "### Step 5: Fix and re-run",
                "",
                "Once you've identified the root cause, you can:",
                "- Re-run the workflow using **scout_workflows** action `run` or `run_with_config`",
                "- Update the workflow with **scout_workflows** action `update` (if you have a corrected configuration)",
                "- Use the **scout_run_workflow** prompt for a guided run experience"
              ].join("\n")
            }
          }
        ]
      };
    }
  );
}