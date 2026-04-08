import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";

const agentsToolInputSchema = {
  action: z.enum(["list", "interact", "interact_sync", "upsert"]),
  agent_id: z.string().optional(),
  data: z.unknown().optional()
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
  action: z.enum(["interact_with_session"]),
  agent_id: z.string().optional(),
  session_id: z.string().optional(),
  data: z.unknown().optional()
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
      description: "Manage Scout agents",
      inputSchema: agentsToolInputSchema
    },
    handler: async (rawInput: AgentsInput) => {
      const input = agentsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/agents"));
        case "interact": {
          const response = (await client.request(`/agents/${input.agent_id}/interact`, {
            method: "POST",
            body: input.data,
            rawResponse: true
          })) as Response;

          return toToolResult(await readStreamText(response));
        }
        case "interact_sync":
          return toToolResult(await client.post(`/agents/${input.agent_id}/interact-sync`, input.data));
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
      description: "Interact with Scout agents using sessions",
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
