import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";
import {
  SCOUT_USAGE_DESCRIPTION,
  USAGE_ACTION_DESCRIPTION,
} from "../descriptions.js";

const usageToolInputSchema = {
  action: z.enum(["get"]).describe(USAGE_ACTION_DESCRIPTION)
};

type UsageInput = z.infer<z.ZodObject<typeof usageToolInputSchema>>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerUsageTool(client: ScoutApiClient) {
  return {
    name: "scout_usage",
    config: {
      description: SCOUT_USAGE_DESCRIPTION,
      inputSchema: usageToolInputSchema
    },
    handler: async (_rawInput: UsageInput, _extra: any) => toToolResult(await client.get("/v2/usage"))
  };
}