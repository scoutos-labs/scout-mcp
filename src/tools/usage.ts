import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";

const usageToolInputSchema = {
  action: z.enum(["get"])
};

type UsageInput = z.infer<z.ZodObject<typeof usageToolInputSchema>>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerUsageTool(client: ScoutApiClient) {
  return {
    name: "scout_usage",
    config: { description: "Get Scout usage information", inputSchema: usageToolInputSchema },
    handler: async (_rawInput: UsageInput) => toToolResult(await client.get("/v2/usage"))
  };
}
