import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScoutApiClient } from "../api-client.js";

export function registerScoutCreateAgentPrompt(
  server: McpServer,
  _client: ScoutApiClient
) {
  server.registerPrompt(
    "scout_create_agent",
    {
      description: "I want to build a new agent."
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "I want to build a new agent."
            }
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: [
                "Let's create a new Scout agent. Here's how:",
                "",
                "### Step 1: Check existing agents",
                "",
                "Use **scout_agents** with action `list` to see what agents already exist.",
                "You may find one you can reuse or update instead of creating from scratch.",
                "",
                "### Step 2: Prepare the agent definition",
                "",
                "Use **scout_agents** with action `upsert` and include the following in the `data` field:",
                "",
                "```json",
                "{",
                '  "name": "my-agent-name",',
                '  "system_prompt": "You are a helpful assistant that...",',
                '  "model": "gpt-4o",',
                '  "tools": [],',
                '  "knowledge_sources": []',
                "}",
                "```",
                "",
                "Key fields:",
                "- **name** — A unique identifier for the agent",
                "- **system_prompt** — Instructions that define the agent's behavior and personality",
                "- **model** — The LLM to use (e.g., `gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet`)",
                "- **tools** — List of tool definitions the agent can use (optional)",
                "- **knowledge_sources** — Collections or documents the agent can reference (optional)",
                "",
                "### Step 3: Test the agent",
                "",
                "After creating, use **scout_agents** with action `interact` (streaming) or `interact_sync` (non-streaming) to send a test message.",
                "Pass the `agent_id` and a message in the `data` field.",
                "",
                "### Step 4: Create a multi-turn session (optional)",
                "",
                "For conversations that need context persistence, use **scout_agent_sessions** with action `interact_with_session`.",
                "This preserves conversation history across multiple turns.",
                "",
                "### Step 5: Deploy as a copilot (optional)",
                "",
                "If you want to embed the agent on a website, use **scout_copilots** with action `create`. Pass the `agent_id` and configure appearance settings."
              ].join("\n")
            }
          }
        ]
      };
    }
  );
}