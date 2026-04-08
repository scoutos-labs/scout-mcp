import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";

const integrationsToolInputSchema = {
  action: z.enum(["list", "list_channels", "delete_integration"]),
  integration_id: z.string().optional()
};

const integrationsValidationSchema = z.object({ ...integrationsToolInputSchema }).superRefine((input, context) => {
  if (input.action === "delete_integration" && !input.integration_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "integration_id is required for this action", path: ["integration_id"] });
  }
});

type IntegrationsInput = z.infer<typeof integrationsValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerIntegrationsTool(client: ScoutApiClient) {
  return {
    name: "scout_integrations",
    config: { description: "Manage Scout integrations", inputSchema: integrationsToolInputSchema },
    handler: async (rawInput: IntegrationsInput) => {
      const input = integrationsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/integrations"));
        case "list_channels":
          return toToolResult(await client.get("/v2/integrations/slack/channels"));
        case "delete_integration":
          return toToolResult(await client.delete(`/v2/integrations/${input.integration_id}`));
      }
    }
  };
}
