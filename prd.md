# PRD: Scout OS MCP Server

## Goal

Build an MCP server that wraps the Scout OS API (79 endpoints) and deploys to Scout Live at `https://mcp-scout.scoutos.live`. The server exposes MCP tools and resources so any MCP-compatible client can manage Scout workflows, agents, collections, and more.

## Constraints & Decisions

| Decision | Choice |
|---|---|
| Runtime | Bun |
| Language | TypeScript (strict) |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Transport | Streamable HTTP |
| HTTP framework | Express (MCP SDK compatible) |
| Test framework | Vitest |
| Test approach | TDD — write failing tests first, then implement |
| API client | Hand-rolled typed fetch wrapper (not auto-generated) |
| Auth model | `SCOUT_API_KEY` env var, passed as Bearer token to Scout API |
| Deployment | Scout Live (`mcp-scout.scoutos.live`) |

## Implementation Steps

### Step 1: Project Scaffold & Build Pipeline

**Goal**: A working TypeScript/Bun project that builds, lints, and runs a hello-world HTTP server.

**Tests**:
- `test/index.test.ts`: Server starts and responds to `GET /health` with `{ ok: true }`

**Implementation**:
- `package.json` with dependencies: `@modelcontextprotocol/sdk`, `express`, `zod`, `typescript`
- `package.json` with devDependencies: `vitest`, `@types/express`, `typescript`
- `tsconfig.json` — strict mode, ES2022 target, Bun types
- `src/index.ts` — Express app with `GET /health` endpoint
- `vitest.config.ts`
- Scripts: `dev`, `build`, `start`, `test`, `lint`

**Success Criteria**:
- [ ] `bun install` completes without errors
- [ ] `bun run dev` starts a server on `PORT`
- [ ] `curl localhost:3000/health` returns `{ "ok": true }`
- [ ] `bun test` passes with the health check test
- [ ] `bun run build` produces output in `dist/`

---

### Step 2: MCP Server with Streamable HTTP Transport

**Goal**: A bare MCP server connected via Streamable HTTP transport, with no tools yet.

**Tests**:
- `test/mcp.test.ts`: MCP `initialize` request returns valid capabilities response
- `test/mcp.test.ts`: MCP `tools/list` returns empty array (no tools yet)
- `test/mcp.test.ts`: Unrecognized MCP method returns error

**Implementation**:
- `src/server.ts` — Creates an `McpServer` instance, configures server info and capabilities
- `src/index.ts` — Wires `McpServer` to Express via Streamable HTTP transport on `/mcp`
- Bearer token auth for MCP connection (optional, configurable)

**Success Criteria**:
- [ ] MCP `initialize` handshake completes successfully
- [ ] `tools/list` returns `{ tools: [] }`
- [ ] `resources/list` returns `{ resources: [] }`
- [ ] Server works with MCP Inspector
- [ ] All tests pass

---

### Step 3: API Client Module

**Goal**: A typed, tested API client that handles Bearer auth, request construction, cursor pagination, and error mapping.

**Tests** (all use `msw` or similar to mock `api.scoutos.com`):
- `test/api-client.test.ts`: Sets `Authorization: Bearer <key>` header on every request
- `test/api-client.test.ts`: Throws structured error on 4xx/5xx with status, message, body
- `test/api-client.test.ts`: GET request serializes query params correctly
- `test/api-client.test.ts`: POST/PUT/PATCH sends JSON body with correct content-type
- `test/api-client.test.ts`: `listAll()` auto-paginates using `next_cursor` until exhausted
- `test/api-client.test.ts`: Preserves raw `fetch` Response when caller needs streaming (agent interact)

**Implementation**:
- `src/api-client.ts` — `ScoutApiClient` class
  - Constructor takes `apiKey: string`, optional `baseUrl`
  - Methods: `get()`, `post()`, `put()`, `patch()`, `delete()`, `request()`
  - `listAll(path, params)` — handles cursor pagination automatically
  - Error class: `ScoutApiError` with `status`, `message`, `body`
  - Exposes raw `fetch` Response for streaming endpoints

**Success Criteria**:
- [ ] All 6 API client tests pass with mocked HTTP
- [ ] Bearer token is always set
- [ ] Errors are caught and re-thrown as `ScoutApiError`
- [ ] Pagination helper returns all items across pages
- [ ] No real network calls made in tests

---

### Step 4: Workflows Tool

**Goal**: First domain tool — `scout_workflows` — proving out the tool pattern.

**Tests**:
- `test/tools/workflows.test.ts`: `scout_workflows` with `action: "list"` calls `GET /v2/workflows` and returns tools/call result
- `test/tools/workflows.test.ts`: `action: "get"` with `workflow_id` calls `GET /v2/workflows/:id`
- `test/tools/workflows.test.ts`: `action: "create"` sends POST with correct body
- `test/tools/workflows.test.ts`: `action: "run"` calls `POST /v2/workflows/:id/run`
- `test/tools/workflows.test.ts`: `action: "run_with_config"` calls `POST /v2/workflows/:id/run-with-config`
- `test/tools/workflows.test.ts`: Invalid action returns MCP error
- `test/tools/workflows.test.ts`: Missing required params return MCP error with validation message

**Implementation**:
- `src/tools/workflows.ts` — Zod schema for input, handler function
- `src/server.ts` — Register `scout_workflows` tool

**Success Criteria**:
- [ ] All 7 workflow tests pass
- [ ] `tools/list` now includes `scout_workflows` with correct inputSchema
- [ ] `tools/call` with `scout_workflows` executes correct API calls
- [ ] Validation errors are clear and actionable

---

### Step 5: Agents Tool

**Goal**: `scout_agents` tool including streaming interaction support.

**Tests**:
- `test/tools/agents.test.ts`: `action: "list"` returns agents
- `test/tools/agents.test.ts`: `action: "interact"` streams SSE response as text content
- `test/tools/agents.test.ts`: `action: "interact_sync"` returns synchronous response
- `test/tools/agents.test.ts`: `action: "upsert"` creates/updates an agent
- `test/tools/agents.test.ts`: `action: "interact_with_session"` includes session_id

**Implementation**:
- `src/tools/agents.ts` — Handles streaming vs sync responses
- `src/server.ts` — Register `scout_agents` and `scout_agent_sessions` tools

**Success Criteria**:
- [ ] All agent tests pass
- [ ] Streaming interact returns SSE content as MCP text content
- [ ] Sync interact returns complete response
- [ ] Session-based endpoints pass session_id correctly

---

### Step 6: Collections & Tables Tools

**Goal**: `scout_collections` and `scout_tables` tools.

**Tests**:
- `test/tools/collections.test.ts`: CRUD operations for collections
- `test/tools/collections.test.ts`: Views sub-actions (list, create, update, delete)
- `test/tools/tables.test.ts`: CRUD operations for tables within a collection
- `test/tools/tables.test.ts`: `get_schema` returns table schema
- `test/tools/tables.test.ts`: `sync` triggers table sync

**Implementation**:
- `src/tools/collections.ts`
- `src/tools/tables.ts`
- `src/server.ts` — Register both tools

**Success Criteria**:
- [ ] All collection and table tests pass
- [ ] Nested paths (e.g., `/v2/collections/:id/tables`) are constructed correctly
- [ ] View operations work through the collections tool

---

### Step 7: Documents Tool

**Goal**: `scout_documents` tool with batch operations.

**Tests**:
- `test/tools/documents.test.ts`: CRUD for single documents
- `test/tools/documents.test.ts`: `update_batch` sends array of updates
- `test/tools/documents.test.ts`: `delete_batch` sends array of IDs
- `test/tools/documents.test.ts`: List documents with pagination

**Implementation**:
- `src/tools/documents.ts`
- `src/server.ts` — Register tool

**Success Criteria**:
- [ ] All document tests pass
- [ ] Batch operations send correct payloads
- [ ] Pagination works for document lists

---

### Step 8: Syncs, Sources & Triggers Tools

**Goal**: `scout_syncs` and `scout_triggers` tools.

**Tests**:
- `test/tools/syncs.test.ts`: CRUD for syncs
- `test/tools/syncs.test.ts`: `execute` triggers a sync run
- `test/tools/syncs.test.ts`: `list_sources` returns available source types
- `test/tools/triggers.test.ts`: CRUD for triggers
- `test/tools/triggers.test.ts`: `execute_slack`, `execute_telegram`, `execute_cron` each call correct endpoint
- `test/tools/triggers.test.ts`: `update_cron_auth_headers` sends correct body

**Implementation**:
- `src/tools/syncs.ts`
- `src/tools/triggers.ts`
- `src/server.ts` — Register both tools

**Success Criteria**:
- [ ] All sync and trigger tests pass
- [ ] Source types are listed correctly
- [ ] Platform-specific trigger executions (Slack, Telegram, cron) hit correct endpoints

---

### Step 9: Copilots, Logs, Integrations, Drive & Usage Tools

**Goal**: Remaining tools to cover all 79 endpoints.

**Tests**:
- `test/tools/copilots.test.ts`: CRUD for copilots
- `test/tools/logs.test.ts`: List logs, get log details
- `test/tools/integrations.test.ts`: List integrations, list Slack channels, delete integration
- `test/tools/drive.test.ts`: Upload file, download file
- `test/tools/usage.test.ts`: Get usage info

**Implementation**:
- `src/tools/copilots.ts`
- `src/tools/logs.ts`
- `src/tools/integrations.ts`
- `src/tools/drive.ts`
- `src/tools/usage.ts`
- `src/server.ts` — Register all remaining tools

**Success Criteria**:
- [ ] All tests pass, total test count >= 40
- [ ] Every Scout API endpoint is reachable through at least one tool action
- [ ] `tools/list` returns all 13 tools

---

### Step 10: MCP Resources

**Goal**: Expose read-only resources for workflows, collections, and agents.

**Tests**:
- `test/resources.test.ts`: `resources/list` returns 3 resources
- `test/resources.test.ts`: `resources/read` for `scout://workflows` returns workflow list as text
- `test/resources/test.ts`: `resources/read` for `scout://collections` returns collection list
- `test/resources.test.ts`: `resources/read` for `scout://agents` returns agent list

**Implementation**:
- `src/resources/index.ts` — Register all 3 resources with read handlers

**Success Criteria**:
- [ ] All resource tests pass
- [ ] `resources/list` shows all 3 resources with correct URIs
- [ ] `resources/read` for each URI returns current data from the API

---

### Step 11: Integration Test Suite & Error Handling

**Goal**: End-to-end MCP protocol tests and robust error handling across all tools.

**Tests**:
- `test/integration.test.ts`: Full MCP initialize → list tools → call tool flow
- `test/integration.test.ts`: API 404 error maps to MCP error with helpful message
- `test/integration.test.ts`: API 401 error maps to MCP auth error
- `test/integration.test.ts`: API 500 error maps to MCP internal error
- `test/integration.test.ts`: Network timeout produces MCP error (not crash)
- `test/integration.test.ts`: Concurrent tool calls work correctly

**Implementation**:
- Error mapping in `api-client.ts` — map HTTP status codes to MCP error codes
- Timeout handling for long-running operations
- Input validation error messages refined based on test findings

**Success Criteria**:
- [ ] All integration tests pass
- [ ] API errors are surfaced as MCP errors, never as unhandled exceptions
- [ ] Total test count >= 50
- [ ] No flaky tests

---

### Step 12: Dockerfile & Scout Live Deployment

**Goal**: Production Dockerfile and deploy-to-live script.

**Tests**:
- `test/deploy.test.ts`: Dockerfile builds successfully (run `docker build .`)
- `test/deploy.test.ts`: Container starts and health check passes
- `test/deploy.test.ts`: SSE transport responds to MCP initialize

**Implementation**:
- `Dockerfile` — Bun-based, listens on `PORT`, runs compiled JS
- `.dockerignore`
- `scripts/deploy.sh` — Packages tarball and POSTs to Scout Live API
- Update `README.md` with final deployment instructions

**Success Criteria**:
- [ ] `docker build .` succeeds
- [ ] `docker run -p 3000:3000 -e SCOUT_API_KEY=xxx <image>` starts and passes health check
- [ ] MCP Inspector connects to the containerized server
- [ ] `scripts/deploy.sh` deploys to `mcp-scout.scoutos.live`
- [ ] `https://mcp-scout.scoutos.live/health` returns `{ "ok": true }`

---

## Test Strategy Summary

| Layer | What | How |
|---|---|---|
| Unit | API client, tool schemas, error mapping | Vitest + msw (mock HTTP) |
| Tool | Each tool's actions | Vitest + msw, verify correct API calls |
| Integration | Full MCP protocol flow | Vitest + MCP client, mock API |
| E2E | Docker + health + MCP connect | Docker build/run, real MCP handshake |

**Target**: 50+ tests, all passing, no flaky, no real network calls in CI.

## Open Questions

1. **Auth on the MCP server itself**: Should the MCP server require authentication (e.g., Bearer token) to connect, or is it open to any MCP client that can reach the URL? This matters for Scout Live deployment since the server will be public.

2. **Streaming responses**: Should agent `interact` tools return the full accumulated text, or stream SSE chunks back as multiple MCP content blocks? MCP supports streaming via `isError: false` partial results.

3. **Subdomain**: Is `mcp-scout` the right subdomain, or should it be something like `scout-api-mcp` or `mcp-server`?

4. **Runtime**: Bun is assumed based on Scout Live examples. Should we use Node.js instead for broader compatibility?

5. **Tool granularity**: The plan groups 79 endpoints into 13 tools with `action` params. An alternative is ~30 smaller tools (e.g., `scout_list_workflows`, `scout_run_workflow`). The grouped approach is recommended for LLM context efficiency, but wanted to confirm.

6. **Pagination behavior**: Should list tools auto-paginate (fetch all pages) by default, or return a single page and let the caller request more? Auto-paginate is simpler for LLMs but could be slow for large datasets.