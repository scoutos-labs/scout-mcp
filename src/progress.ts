import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/**
 * Send a progress notification if the client provided a progressToken.
 * Silently no-ops if no token was provided (client didn't request progress).
 */
export async function sendProgress(
  extra: Extra,
  progress: number,
  total: number,
  message?: string
): Promise<void> {
  const progressToken = extra._meta?.progressToken;
  if (progressToken === undefined) {
    return;
  }

  await extra.sendNotification({
    method: "notifications/progress",
    params: {
      progressToken,
      progress,
      total,
      ...(message ? { message } : {})
    }
  });
}