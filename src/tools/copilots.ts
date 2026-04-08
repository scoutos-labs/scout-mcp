import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";

const copilotsToolInputSchema = {
  action: z.enum(["list", "get", "create", "update", "delete"]),
  copilot_id: z.string().optional(),
  data: z.unknown().optional()
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
    config: { description: "Manage Scout copilots", inputSchema: copilotsToolInputSchema },
    handler: async (rawInput: CopilotsInput) => {
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
