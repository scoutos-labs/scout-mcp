import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";
import {
  SCOUT_COPILOTS_DESCRIPTION,
  COPILOTS_ACTION_DESCRIPTION,
  COPILOT_ID_DESCRIPTION,
  COPILOTS_DATA_DESCRIPTION,
} from "../descriptions.js";

const copilotsToolInputSchema = {
  action: z.enum(["list", "get", "create", "update", "delete"]).describe(COPILOTS_ACTION_DESCRIPTION),
  copilot_id: z.string().optional().describe(COPILOT_ID_DESCRIPTION),
  data: z.unknown().optional().describe(COPILOTS_DATA_DESCRIPTION)
};

const copilotsValidationSchema = z.object({ ...copilotsToolInputSchema }).superRefine((input, context) => {
  if (["get", "update", "delete"].includes(input.action) && !input.copilot_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "copilot_id is required for this action", path: ["copilot_id"] });
  }

  if (["create", "update"].includes(input.action) && typeof input.data === "undefined") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "data is required for this action", path: ["data"] });
  }
});

type CopilotsInput = z.infer<typeof copilotsValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerCopilotsTool(client: ScoutApiClient) {
  return {
    name: "scout_copilots",
    config: {
      description: SCOUT_COPILOTS_DESCRIPTION,
      inputSchema: copilotsToolInputSchema
    },
    handler: async (rawInput: CopilotsInput, _extra: any) => {
      const input = copilotsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/copilots"));
        case "get":
          return toToolResult(await client.get(`/v2/copilots/${input.copilot_id}`));
        case "create":
          return toToolResult(await client.post("/v2/copilots", input.data));
        case "update":
          return toToolResult(await client.patch(`/v2/copilots/${input.copilot_id}`, input.data));
        case "delete":
          return toToolResult(await client.delete(`/v2/copilots/${input.copilot_id}`));
      }
    }
  };
}