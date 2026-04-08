import { z } from "zod";

import { ScoutApiClient } from "../api-client.js";

const driveToolInputSchema = {
  action: z.enum(["upload", "download"]),
  file_id: z.string().optional(),
  data: z.unknown().optional()
};

const driveValidationSchema = z.object({ ...driveToolInputSchema }).superRefine((input, context) => {
  if (input.action === "upload" && typeof input.data === "undefined") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "data is required for upload", path: ["data"] });
  }

  if (input.action === "download" && !input.file_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "file_id is required for download", path: ["file_id"] });
  }
});

type DriveInput = z.infer<typeof driveValidationSchema>;

function toToolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

export function registerDriveTool(client: ScoutApiClient) {
  return {
    name: "scout_drive",
    config: { description: "Upload and download Scout drive files", inputSchema: driveToolInputSchema },
    handler: async (rawInput: DriveInput) => {
      const input = driveValidationSchema.parse(rawInput);

      switch (input.action) {
        case "upload":
          return toToolResult(await client.post("/drive/upload", input.data));
        case "download": {
          const response = (await client.request(`/drive/${input.file_id}/download`, {
            method: "GET",
            rawResponse: true,
            headers: { accept: "application/octet-stream" }
          })) as Response;
          return toToolResult(await response.text());
        }
      }
    }
  };
}
