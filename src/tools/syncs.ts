import { z } from "zod";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

import { ScoutApiClient } from "../api-client.js";
import { sendProgress } from "../progress.js";
import {
  SCOUT_SYNCS_DESCRIPTION,
  SYNCS_ACTION_DESCRIPTION,
  SYNC_ID_DESCRIPTION,
  SYNCS_DATA_DESCRIPTION,
} from "../descriptions.js";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const syncsToolInputSchema = {
  action: z.enum(["list", "get", "create", "update", "delete", "execute", "list_sources"]).describe(SYNCS_ACTION_DESCRIPTION),
  sync_id: z.string().optional().describe(SYNC_ID_DESCRIPTION),
  data: z.unknown().optional().describe(SYNCS_DATA_DESCRIPTION)
};

const syncsValidationSchema = z.object({ ...syncsToolInputSchema }).superRefine((input, context) => {
  if (["get", "update", "delete", "execute"].includes(input.action) && !input.sync_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "sync_id is required for this action", path: ["sync_id"] });
  }

  if (["create", "update", "execute"].includes(input.action) && typeof input.data === "undefined") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "data is required for this action", path: ["data"] });
  }
});

type SyncsInput = z.infer<typeof syncsValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerSyncsTool(client: ScoutApiClient) {
  return {
    name: "scout_syncs",
    config: {
      description: SCOUT_SYNCS_DESCRIPTION,
      inputSchema: syncsToolInputSchema
    },
    handler: async (rawInput: SyncsInput, extra: Extra) => {
      const input = syncsValidationSchema.parse(rawInput);

      switch (input.action) {
        case "list":
          return toToolResult(await client.get("/v2/syncs"));
        case "get":
          return toToolResult(await client.get(`/v2/syncs/${input.sync_id}`));
        case "create":
          return toToolResult(await client.post("/v2/syncs", input.data));
        case "update":
          return toToolResult(await client.patch(`/v2/syncs/${input.sync_id}`, input.data));
        case "delete":
          return toToolResult(await client.delete(`/v2/syncs/${input.sync_id}`));
        case "execute": {
          await sendProgress(extra, 1, 3, "Starting sync execution");
          const result = await client.post(`/v2/syncs/${input.sync_id}/execute`, input.data);
          await sendProgress(extra, 2, 3, "Sync executing");
          await sendProgress(extra, 3, 3, "Sync complete");
          return toToolResult(result);
        }
        case "list_sources":
          return toToolResult(await client.get("/v2/syncs/sources"));
      }
    }
  };
}