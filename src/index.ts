import express, { type Express } from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function createApp(): Express {
  const app = express();

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  return app;
}

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  const app = createApp();

  return app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

function isMainModule() {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  startServer();
}
