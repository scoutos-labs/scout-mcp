import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";

const workflowsToolInputSchema = {
  action: z.enum(["list", "get", "create", "run", "run_with_config"]),
  workflow_id: z.string().optional(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  data: z.unknown().optional()
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
      description: "Manage Scout workflows",
      inputSchema: workflowsToolInputSchema
    },
    handler: async (rawInput: WorkflowsInput) => {
      const input = workflowsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/workflows", input.params));
        case "get":
          return toToolResult(await client.get(`/v2/workflows/${input.workflow_id}`));
        case "create":
          return toToolResult(await client.post("/v2/workflows", input.data));
        case "run":
          return toToolResult(await client.post(`/v2/workflows/${input.workflow_id}/run`, input.data));
        case "run_with_config":
          return toToolResult(
            await client.post(`/v2/workflows/${input.workflow_id}/run-with-config`, input.data)
          );
      }
    }
  };
}
