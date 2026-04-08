import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";

const triggersToolInputSchema = {
  action: z.enum(["list", "create", "update", "delete", "execute_slack", "execute_telegram", "execute_cron", "update_cron_auth_headers"]),
  trigger_id: z.string().optional(),
  data: z.unknown().optional()
};

const triggersValidationSchema = z.object({ ...triggersToolInputSchema }).superRefine((input, context) => {
  if (["update", "delete", "execute_slack", "execute_telegram", "execute_cron", "update_cron_auth_headers"].includes(input.action) && !input.trigger_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "trigger_id is required for this action", path: ["trigger_id"] });
  }

  if (["create", "update", "execute_slack", "execute_telegram", "execute_cron", "update_cron_auth_headers"].includes(input.action) && typeof input.data === "undefined") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "data is required for this action", path: ["data"] });
  }
});

type TriggersInput = z.infer<typeof triggersValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerTriggersTool(client: ScoutApiClient) {
  return {
    name: "scout_triggers",
    config: {
      description: "Manage Scout triggers",
      inputSchema: triggersToolInputSchema
    },
    handler: async (rawInput: TriggersInput) => {
      const input = triggersValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/triggers"));
        case "create":
          return toToolResult(await client.post("/v2/triggers", input.data));
        case "update":
          return toToolResult(await client.patch(`/v2/triggers/${input.trigger_id}`, input.data));
        case "delete":
          return toToolResult(await client.delete(`/v2/triggers/${input.trigger_id}`));
        case "execute_slack":
          return toToolResult(await client.post(`/v2/triggers/${input.trigger_id}/execute-slack`, input.data));
        case "execute_telegram":
          return toToolResult(await client.post(`/v2/triggers/${input.trigger_id}/execute-telegram`, input.data));
        case "execute_cron":
          return toToolResult(await client.post(`/v2/triggers/${input.trigger_id}/execute-cron`, input.data));
        case "update_cron_auth_headers":
          return toToolResult(await client.patch(`/v2/triggers/${input.trigger_id}/cron-auth-headers`, input.data));
      }
    }
  };
}
