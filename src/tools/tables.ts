import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";
import {
  SCOUT_TABLES_DESCRIPTION,
  TABLES_ACTION_DESCRIPTION,
  COLLECTION_ID_DESCRIPTION,
  TABLE_ID_DESCRIPTION,
  TABLES_DATA_DESCRIPTION,
} from "../descriptions.js";

const tablesToolInputSchema = {
  action: z.enum(["list", "get", "create", "update", "delete", "get_schema", "sync"]).describe(TABLES_ACTION_DESCRIPTION),
  collection_id: z.string().optional().describe(COLLECTION_ID_DESCRIPTION),
  table_id: z.string().optional().describe(TABLE_ID_DESCRIPTION),
  data: z.unknown().optional().describe(TABLES_DATA_DESCRIPTION)
};

const tablesValidationSchema = z.object({ ...tablesToolInputSchema }).superRefine((input, context) => {
  if (!input.collection_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "collection_id is required for this action", path: ["collection_id"] });
  }

  if (["get", "update", "delete", "get_schema", "sync"].includes(input.action) && !input.table_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "table_id is required for this action", path: ["table_id"] });
  }

  if (["create", "update", "sync"].includes(input.action) && typeof input.data === "undefined") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "data is required for this action", path: ["data"] });
  }
});

type TablesInput = z.infer<typeof tablesValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerTablesTool(client: ScoutApiClient) {
  return {
    name: "scout_tables",
    config: {
      description: SCOUT_TABLES_DESCRIPTION,
      inputSchema: tablesToolInputSchema
    },
    handler: async (rawInput: TablesInput, _extra: any) => {
      const input = tablesValidationSchema.parse(rawInput);
      const basePath = `/v2/collections/${input.collection_id}/tables`;

      switch (input.action) {
        case "list":
          return toToolResult(await client.get(basePath));
        case "get":
          return toToolResult(await client.get(`${basePath}/${input.table_id}`));
        case "create":
          return toToolResult(await client.post(basePath, input.data));
        case "update":
          return toToolResult(await client.patch(`${basePath}/${input.table_id}`, input.data));
        case "delete":
          return toToolResult(await client.delete(`${basePath}/${input.table_id}`));
        case "get_schema":
          return toToolResult(await client.get(`${basePath}/${input.table_id}/schema`));
        case "sync":
          return toToolResult(await client.post(`${basePath}/${input.table_id}/sync`, input.data));
      }
    }
  };
}