import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";
import {
  SCOUT_LOGS_DESCRIPTION,
  LOGS_ACTION_DESCRIPTION,
  LOG_ID_DESCRIPTION,
} from "../descriptions.js";

const logsToolInputSchema = {
  action: z.enum(["list", "get_details"]).describe(LOGS_ACTION_DESCRIPTION),
  log_id: z.string().optional().describe(LOG_ID_DESCRIPTION)
};

const logsValidationSchema = z.object({ ...logsToolInputSchema }).superRefine((input, context) => {
  if (input.action === "get_details" && !input.log_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "log_id is required for this action", path: ["log_id"] });
  }
});

type LogsInput = z.infer<typeof logsValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerLogsTool(client: ScoutApiClient) {
  return {
    name: "scout_logs",
    config: {
      description: SCOUT_LOGS_DESCRIPTION,
      inputSchema: logsToolInputSchema
    },
    handler: async (rawInput: LogsInput) => {
      const input = logsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/run_logs"));
        case "get_details":
          return toToolResult(await client.get(`/v2/run_logs/${input.log_id}`));
      }
    }
  };
}