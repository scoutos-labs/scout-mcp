import { z } from "zod";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

import { ScoutApiClient } from "../api-client.js";
import { sendProgress } from "../progress.js";
import {
  SCOUT_AGENTS_DESCRIPTION,
  SCOUT_AGENT_SESSIONS_DESCRIPTION,
  AGENTS_ACTION_DESCRIPTION,
  AGENT_SESSIONS_ACTION_DESCRIPTION,
  AGENT_ID_DESCRIPTION,
  SESSION_ID_DESCRIPTION,
  AGENTS_DATA_DESCRIPTION,
  AGENT_SESSIONS_DATA_DESCRIPTION,
} from "../descriptions.js";

const agentsToolInputSchema = {
  action: z.enum(["list", "interact", "interact_sync", "upsert"]).describe(AGENTS_ACTION_DESCRIPTION),
  agent_id: z.string().optional().describe(AGENT_ID_DESCRIPTION),
  data: z.unknown().optional().describe(AGENTS_DATA_DESCRIPTION)
};

const agentsValidationSchema = z
  .object({
    ...agentsToolInputSchema
  })
  .superRefine((input, context) => {
    if (["interact", "interact_sync"].includes(input.action) && !input.agent_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "agent_id is required for this action",
        path: ["agent_id"]
      });
    }

    if (["interact", "interact_sync", "upsert"].includes(input.action) && typeof input.data === "undefined") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "data is required for this action",
        path: ["data"]
      });
    }
  });

const agentSessionToolInputSchema = {
  action: z.enum(["interact_with_session"]).describe(AGENT_SESSIONS_ACTION_DESCRIPTION),
  agent_id: z.string().optional().describe(AGENT_ID_DESCRIPTION),
  session_id: z.string().optional().describe(SESSION_ID_DESCRIPTION),
  data: z.unknown().optional().describe(AGENT_SESSIONS_DATA_DESCRIPTION)
};

const agentSessionValidationSchema = z
  .object({
    ...agentSessionToolInputSchema
  })
  .superRefine((input, context) => {
    if (!input.agent_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "agent_id is required for this action",
        path: ["agent_id"]
      });
    }

    if (!input.session_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "session_id is required for this action",
        path: ["session_id"]
      });
    }

    if (typeof input.data === "undefined") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "data is required for this action",
        path: ["data"]
      });
    }
  });

type AgentsInput = z.infer<typeof agentsValidationSchema>;
type AgentSessionInput = z.infer<typeof agentSessionValidationSchema>;
type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

function toToolResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
      }
    ]
  };
}

async function readStreamText(response: Response) {
  const raw = await response.text();
  const chunks = raw
    .split("\n\n")
    .flatMap((eventBlock) =>
      eventBlock
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
    )
    .filter(Boolean)
    .map((chunk) => {
      try {
        const parsed = JSON.parse(chunk) as { text?: string; delta?: string; content?: string };
        return parsed.text ?? parsed.delta ?? parsed.content ?? chunk;
      } catch {
        return chunk;
      }
    });

  return chunks.join("");
}

export function registerAgentsTool(client: ScoutApiClient) {
  return {
    name: "scout_agents",
    config: {
      description: SCOUT_AGENTS_DESCRIPTION,
      inputSchema: agentsToolInputSchema
    },
    handler: async (rawInput: AgentsInput, extra: Extra) => {
      const input = agentsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/agents"));
        case "interact": {
          await sendProgress(extra, 1, 3, "Sending message to agent");
          const response = (await client.request(`/agents/${input.agent_id}/interact`, {
            method: "POST",
            body: input.data,
            rawResponse: true
          })) as Response;
          await sendProgress(extra, 2, 3, "Agent processing");
          const text = await readStreamText(response);
          await sendProgress(extra, 3, 3, "Reading response");
          return toToolResult(text);
        }
        case "interact_sync": {
          await sendProgress(extra, 1, 2, "Sending message to agent");
          const result = await client.post(`/agents/${input.agent_id}/interact-sync`, input.data);
          await sendProgress(extra, 2, 2, "Agent response received");
          return toToolResult(result);
        }
        case "upsert":
          return toToolResult(await client.post("/agents/upsert", input.data));
      }
    }
  };
}

export function registerAgentSessionsTool(client: ScoutApiClient) {
  return {
    name: "scout_agent_sessions",
    config: {
      description: SCOUT_AGENT_SESSIONS_DESCRIPTION,
      inputSchema: agentSessionToolInputSchema
    },
    handler: async (rawInput: AgentSessionInput) => {
      const input = agentSessionValidationSchema.parse(rawInput);

      return toToolResult(
        await client.post(`/agents/${input.agent_id}/interact`, {
          ...(typeof input.data === "object" && input.data !== null ? input.data : { input: input.data }),
          session_id: input.session_id
        })
      );
    }
  };
}