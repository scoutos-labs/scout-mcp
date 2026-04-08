#!/usr/bin/env node

import { startServer } from "./index.js";

function printHelp() {
  console.log(`scoutos-mcp

Usage:
  scoutos-mcp [--port <number>] [--host <host>]

Environment:
  SCOUT_API_KEY              Required Scout API key
  PORT                       Optional port override (default: 3000)
  HOST                       Optional host override (default: 127.0.0.1)
  MCP_SERVER_BEARER_TOKEN    Optional bearer token for protecting /mcp
`);
}

function parseArgs(args: string[]) {
  let port = Number(process.env.PORT ?? 3000);
  let host = process.env.HOST ?? "127.0.0.1";
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--port") {
      port = Number(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--host") {
      host = args[index + 1] ?? host;
      index += 1;
    }
  }

  if (!Number.isInteger(port) || port <= 0) {
    console.error("Invalid port. Use a positive integer.");
    process.exit(1);
  }

  return { port, host, help };
}

function ensureRequiredEnv() {
  if (!process.env.SCOUT_API_KEY) {
    console.error("SCOUT_API_KEY is required.");
    process.exit(1);
  }
}

const { port, host, help } = parseArgs(process.argv.slice(2));

if (help) {
  printHelp();
  process.exit(0);
}

ensureRequiredEnv();

startServer(port, host);
