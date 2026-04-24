import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";
import {
  SCOUT_DOCUMENTS_DESCRIPTION,
  DOCUMENTS_ACTION_DESCRIPTION,
  COLLECTION_ID_DESCRIPTION,
  TABLE_ID_DESCRIPTION,
  DOCUMENT_ID_DESCRIPTION,
  DOCUMENTS_DATA_DESCRIPTION,
  DOCUMENTS_PARAMS_DESCRIPTION,
} from "../descriptions.js";

const documentsToolInputSchema = {
  action: z.enum(["list", "get", "create", "update", "delete", "update_batch", "delete_batch"]).describe(DOCUMENTS_ACTION_DESCRIPTION),
  collection_id: z.string().optional().describe(COLLECTION_ID_DESCRIPTION),
  table_id: z.string().optional().describe(TABLE_ID_DESCRIPTION),
  document_id: z.string().optional().describe(DOCUMENT_ID_DESCRIPTION),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe(DOCUMENTS_PARAMS_DESCRIPTION),
  data: z.unknown().optional().describe(DOCUMENTS_DATA_DESCRIPTION)
};

const documentsValidationSchema = z.object({ ...documentsToolInputSchema }).superRefine((input, context) => {
  if (!input.collection_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "collection_id is required for this action", path: ["collection_id"] });
  }

  if (!input.table_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "table_id is required for this action", path: ["table_id"] });
  }

  if (["get", "update", "delete"].includes(input.action) && !input.document_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "document_id is required for this action", path: ["document_id"] });
  }

  if (["create", "update", "update_batch", "delete_batch"].includes(input.action) && typeof input.data === "undefined") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "data is required for this action", path: ["data"] });
  }
});

type DocumentsInput = z.infer<typeof documentsValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerDocumentsTool(client: ScoutApiClient) {
  return {
    name: "scout_documents",
    config: {
      description: SCOUT_DOCUMENTS_DESCRIPTION,
      inputSchema: documentsToolInputSchema
    },
    handler: async (rawInput: DocumentsInput) => {
      const input = documentsValidationSchema.parse(rawInput);
      const basePath = `/v2/collections/${input.collection_id}/tables/${input.table_id}/documents`;

      switch (input.action) {
        case "list":
          return toToolResult(await client.get(basePath, input.params));
        case "get":
          return toToolResult(await client.get(`${basePath}/${input.document_id}`));
        case "create":
          return toToolResult(await client.post(basePath, input.data));
        case "update":
          return toToolResult(await client.patch(`${basePath}/${input.document_id}`, input.data));
        case "delete":
          return toToolResult(await client.delete(`${basePath}/${input.document_id}`));
        case "update_batch":
          return toToolResult(await client.patch(`${basePath}/batch`, input.data));
        case "delete_batch":
          return toToolResult(await client.post(`${basePath}/delete-batch`, input.data));
      }
    }
  };
}