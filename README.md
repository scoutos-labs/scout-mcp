# scout-mcp

`scout-mcp` is a local MCP (Model Context Protocol) server for the Scout OS API. Install it from npm, set `SCOUT_API_KEY`, run it on your machine, and connect your coding agent to `http://127.0.0.1:3000/mcp`.

## Install

```bash
npm install -g scout-mcp
```

Or run without a global install:

```bash
npx scout-mcp
```

## Quick Start

1. Set your Scout API key:

```bash
export SCOUT_API_KEY=your_api_key_here
```

2. Start the local MCP server:

```bash
scout-mcp
```

3. Point your MCP client or coding agent at:

```text
http://127.0.0.1:3000/mcp
```

4. Check health locally:

```bash
curl http://127.0.0.1:3000/health
```

## CLI

```bash
scout-mcp --help
```

```text
Usage:
  scout-mcp [--port <number>] [--host <host>]
```

Examples:

```bash
scout-mcp --port 3333
scout-mcp --host 127.0.0.1 --port 3333
```

Environment variables:

- `SCOUT_API_KEY`: required Scout API key
- `PORT`: optional port override, defaults to `3000`
- `HOST`: optional host override, defaults to `127.0.0.1`
- `MCP_SERVER_BEARER_TOKEN`: optional bearer token to require on `/mcp`

## Using With Coding Agents

Run `scout-mcp` locally, then configure your MCP-capable tool to use the server URL:

```text
http://127.0.0.1:3000/mcp
```

If your client supports custom headers and you set `MCP_SERVER_BEARER_TOKEN`, include:

```text
Authorization: Bearer <your-token>
```

## Overview

This server wraps the [Scout OS API](https://ref.scoutos.com) and exposes it as a set of MCP tools and resources. It uses the **Streamable HTTP** transport for remote deployment, allowing any MCP-compatible client to connect.

## Architecture

| Concern | Choice |
|---|---|
| Language | TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Transport | Streamable HTTP |
| HTTP Framework | Express |
| API Base URL | `https://api.scoutos.com` |
| Auth | Bearer token (Scout API key) |

## Tools

The server groups the 79 Scout API endpoints into 13 domain tools with an `action` parameter, keeping the tool count manageable for LLMs:

| Tool | API Coverage | Actions |
|---|---|---|
| `scout_workflows` | `/v2/workflows`, revisions, environments | list, get, create, update, delete, run, run_with_config |
| `scout_agents` | `/agents` | list, get, upsert, delete, interact, interact_sync |
| `scout_agent_sessions` | Session-based agent endpoints | interact_with_session, interact_sync_with_session, interact_async_with_session |
| `scout_collections` | `/v2/collections` | list, get, create, update, delete |
| `scout_tables` | `/v2/collections/:id/tables` | list, get, create, update, delete, get_schema, sync |
| `scout_documents` | Document endpoints | list, get, create, update, update_batch, delete, delete_batch |
| `scout_syncs` | `/v2/syncs`, sources | list, get, create, update, delete, execute, list_sources |
| `scout_triggers` | `/v2/triggers` | list, create, update, delete, execute_slack, execute_telegram, execute_cron |
| `scout_copilots` | `/v2/copilots` | list, get, create, update, delete |
| `scout_logs` | `/v2/run_logs` | list, get_details |
| `scout_integrations` | Integrations + org | list, list_channels, delete_integration |
| `scout_drive` | `/drive` | upload, download |
| `scout_usage` | `/v2/usage` | get |

## Resources

Read-only context resources exposed via MCP:

- `scout://workflows` — list of workflows
- `scout://collections` — list of collections
- `scout://agents` — list of agents

## Project Structure

```
src/
├── index.ts              # MCP server entry, Streamable HTTP transport
├── server.ts             # Tool/resource definitions
├── api-client.ts         # Scout API client wrapper
├── tools/
│   ├── workflows.ts
│   ├── agents.ts
│   ├── collections.ts
│   ├── tables.ts
│   ├── documents.ts
│   ├── syncs.ts
│   ├── triggers.ts
│   ├── copilots.ts
│   ├── logs.ts
│   ├── integrations.ts
│   ├── drive.ts
│   └── usage.ts
└── resources/
    └── index.ts           # Resource definitions
```

## Development Setup

```bash
bun install
```

## Local Development

```bash
bun run dev
```

## Testing

```bash
bun test
```

## Build

```bash
bun run build
```

## Package Check

```bash
npm pack --dry-run
```

## Docker

```bash
docker build -t scout-os-mcp-server .
docker run -p 3000:3000 -e SCOUT_API_KEY=your_api_key_here scout-os-mcp-server
```

Health check:

```bash
curl http://localhost:3000/health
```

## Deployment (Scout Live)

The server deploys to [Scout Live](https://scoutos.live) — a container deployment platform built for AI agents. One API call builds and publishes the app.

### Deployment Steps

1. **Get a Scout Live API key** from [scoutos.live/dashboard](https://scoutos.live/dashboard/)

2. **Deploy with the helper script:**
   ```bash
   SCOUT_LIVE_API_KEY=your_live_key ./scripts/deploy.sh mcp-scout
   ```

3. **The server is live** at `https://mcp-scout.scoutos.live`

### Environment Configuration

Set the Scout OS API key as a secret on the deployed app:

```bash
curl -X POST "https://scoutos.live/api/apps/mcp-scout/env" \
  -H "Authorization: Bearer $SCOUT_LIVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "SCOUT_API_KEY", "value": "your_scout_api_key", "secret": true}'
```

### Redeploy

To update the server, re-run the build command with the same subdomain. Scout Live replaces the running app with zero downtime.

### Health Check

The server exposes `GET /health` for Scout Live health checks:

```bash
curl https://scoutos.live/api/apps/mcp-scout/health
```

### Delete

```bash
curl -X DELETE "https://scoutos.live/api/apps/mcp-scout" \
  -H "Authorization: Bearer $SCOUT_LIVE_API_KEY"
```

## References

- [Scout OS API Reference](https://ref.scoutos.com)
- [MCP Specification](https://modelcontextprotocol.io/specification/latest)
- [MCP SDK Documentation](https://modelcontextprotocol.io/docs/sdk)
