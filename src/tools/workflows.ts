import { z } from "zod";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

import { ScoutApiClient } from "../api-client.js";
import { sendProgress } from "../progress.js";
import {
  SCOUT_WORKFLOWS_DESCRIPTION,
  WORKFLOWS_ACTION_DESCRIPTION,
  WORKFLOW_ID_DESCRIPTION,
  WORKFLOWS_DATA_DESCRIPTION,
  WORKFLOWS_PARAMS_DESCRIPTION,
} from "../descriptions.js";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const workflowsToolInputSchema = {
  action: z.enum(["list", "get", "create", "run", "run_with_config"]).describe(WORKFLOWS_ACTION_DESCRIPTION),
  workflow_id: z.string().optional().describe(WORKFLOW_ID_DESCRIPTION),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe(WORKFLOWS_PARAMS_DESCRIPTION),
  data: z.unknown().optional().describe(WORKFLOWS_DATA_DESCRIPTION)
};

const workflowsValidationSchema = z
  .object({
    ...workflowsToolInputSchema
  })
  .superRefine((input, context) => {
    if (["get", "run", "run_with_config"].includes(input.action) && !input.workflow_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "workflow_id is required for this action",
        path: ["workflow_id"]
      });
    }

    if (["create", "run_with_config"].includes(input.action) && typeof input.data === "undefined") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "data is required for this action",
        path: ["data"]
      });
    }
  });

type WorkflowsInput = z.infer<typeof workflowsValidationSchema>;

function toToolResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

export function registerWorkflowsTool(client: ScoutApiClient) {
  return {
    name: "scout_workflows",
    config: {
      description: SCOUT_WORKFLOWS_DESCRIPTION,
      inputSchema: workflowsToolInputSchema
    },
    handler: async (rawInput: WorkflowsInput, extra: Extra) => {
      const input = workflowsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/workflows", input.params));
        case "get":
          return toToolResult(await client.get(`/v2/workflows/${input.workflow_id}`));
        case "create":
          return toToolResult(await client.post("/v2/workflows", input.data));
        case "run": {
          await sendProgress(extra, 1, 3, "Starting workflow execution");
          const result = await client.post(`/v2/workflows/${input.workflow_id}/run`, input.data);
          await sendProgress(extra, 2, 3, "Workflow running");
          await sendProgress(extra, 3, 3, "Processing result");
          return toToolResult(result);
        }
        case "run_with_config": {
          await sendProgress(extra, 1, 3, "Starting workflow execution with config");
          const result = await client.post(
            `/v2/workflows/${input.workflow_id}/run-with-config`,
            input.data
          );
          await sendProgress(extra, 2, 3, "Workflow running");
          await sendProgress(extra, 3, 3, "Processing result");
          return toToolResult(result);
        }
      }
    }
  };
}