import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";
import {
  SCOUT_COLLECTIONS_DESCRIPTION,
  COLLECTIONS_ACTION_DESCRIPTION,
  COLLECTION_ID_DESCRIPTION,
  VIEW_ID_DESCRIPTION,
  COLLECTIONS_DATA_DESCRIPTION,
} from "../descriptions.js";

const collectionsToolInputSchema = {
  action: z.enum(["list", "get", "create", "update", "delete", "list_views", "create_view", "update_view", "delete_view"]).describe(COLLECTIONS_ACTION_DESCRIPTION),
  collection_id: z.string().optional().describe(COLLECTION_ID_DESCRIPTION),
  view_id: z.string().optional().describe(VIEW_ID_DESCRIPTION),
  data: z.unknown().optional().describe(COLLECTIONS_DATA_DESCRIPTION)
};

const collectionsValidationSchema = z.object({ ...collectionsToolInputSchema }).superRefine((input, context) => {
  if (["get", "update", "delete", "list_views", "create_view", "update_view", "delete_view"].includes(input.action) && !input.collection_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "collection_id is required for this action", path: ["collection_id"] });
  }

  if (["create", "update", "create_view", "update_view"].includes(input.action) && typeof input.data === "undefined") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "data is required for this action", path: ["data"] });
  }

  if (["update_view", "delete_view"].includes(input.action) && !input.view_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "view_id is required for this action", path: ["view_id"] });
  }
});

type CollectionsInput = z.infer<typeof collectionsValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerCollectionsTool(client: ScoutApiClient) {
  return {
    name: "scout_collections",
    config: {
      description: SCOUT_COLLECTIONS_DESCRIPTION,
      inputSchema: collectionsToolInputSchema
    },
    handler: async (rawInput: CollectionsInput, _extra: any) => {
      const input = collectionsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/collections"));
        case "get":
          return toToolResult(await client.get(`/v2/collections/${input.collection_id}`));
        case "create":
          return toToolResult(await client.post("/v2/collections", input.data));
        case "update":
          return toToolResult(await client.patch(`/v2/collections/${input.collection_id}`, input.data));
        case "delete":
          return toToolResult(await client.delete(`/v2/collections/${input.collection_id}`));
        case "list_views":
          return toToolResult(await client.get(`/v2/collections/${input.collection_id}/views`));
        case "create_view":
          return toToolResult(await client.post(`/v2/collections/${input.collection_id}/views`, input.data));
        case "update_view":
          return toToolResult(
            await client.patch(`/v2/collections/${input.collection_id}/views/${input.view_id}`, input.data)
          );
        case "delete_view":
          return toToolResult(
            await client.delete(`/v2/collections/${input.collection_id}/views/${input.view_id}`)
          );
      }
    }
  };
}