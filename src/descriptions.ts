/**
 * Rich tool descriptions for all 13 Scout MCP tools.
 *
 * These descriptions are designed to help LLMs make informed decisions about
 * which tool and action to call, without guessing. Each description explains
 * what the tool does, when to use it, what actions are available, and how it
 * relates to other Scout tools.
 */

// ─── Tool-level descriptions ────────────────────────────────────────────────

export const SCOUT_WORKFLOWS_DESCRIPTION =
  "Operate on Scout workflows — the primary automation unit. Use 'list' to see all workflows, 'get' to inspect one by ID, 'create' to define a new workflow, 'run' to execute an existing workflow, or 'run_with_config' to execute with runtime configuration overrides. Workflows chain steps together for tasks like data processing, notifications, and API orchestration. After running a workflow, use scout_logs to inspect execution results and debug failures.";

export const SCOUT_AGENTS_DESCRIPTION =
  "Interact with Scout AI agents — autonomous or semi-autonomous LLM-powered entities. Use 'list' to see all agents, 'interact' to send a message and receive a streaming response, 'interact_sync' for a non-streaming response, or 'upsert' to create or update an agent definition. Agents can be configured with custom system prompts, tools, and knowledge sources. Use scout_agent_sessions for multi-turn conversations that preserve context.";

export const SCOUT_AGENT_SESSIONS_DESCRIPTION =
  "Manage multi-turn conversations with Scout agents using sessions. Use 'interact_with_session' to send a message within an existing session, preserving conversation context across turns. Requires both agent_id and session_id. For single-shot interactions without session persistence, use scout_agents with 'interact' or 'interact_sync' instead.";

export const SCOUT_COLLECTIONS_DESCRIPTION =
  "Manage Scout collections and their views — the top-level organizational container for structured data. Use 'list' to see all collections, 'get' to inspect one by ID, 'create' to define a new collection, 'update' to modify an existing collection, or 'delete' to remove one. Collections also support views: 'list_views', 'create_view', 'update_view', and 'delete_view' manage filtered/sorted perspectives on collection data. Use scout_tables to manage the table schemas within a collection, and scout_documents to work with individual records.";

export const SCOUT_TABLES_DESCRIPTION =
  "Manage Scout tables — the schema-bearing structures inside a collection that define columns and data types. Use 'list' to see all tables in a collection, 'get' to inspect one by ID, 'create' to define a new table with a schema, 'update' to modify a table's configuration, 'delete' to remove a table, 'get_schema' to retrieve the table's column definitions, or 'sync' to trigger a data sync into the table. Always create or identify a collection via scout_collections before working with tables. Use scout_documents to read or write the actual row-level data in a table.";

export const SCOUT_DOCUMENTS_DESCRIPTION =
  "Manage Scout documents — individual records (rows) stored in a table within a collection. Use 'list' to query documents with optional filters, 'get' to retrieve one by ID, 'create' to insert a new document, 'update' to modify an existing document, 'delete' to remove one, 'update_batch' to modify multiple documents at once, or 'delete_batch' to remove multiple documents. Requires both collection_id and table_id to identify the target table. Use scout_tables to manage the table schema before working with documents.";

export const SCOUT_SYNCS_DESCRIPTION =
  "Manage Scout data syncs — configured pipelines that import data from external sources into Scout tables. Use 'list' to see all syncs, 'get' to inspect one by ID, 'create' to define a new sync, 'update' to modify an existing sync, 'delete' to remove one, 'execute' to run a sync immediately, or 'list_sources' to discover available external data sources. Syncs are the primary way to bring external data (APIs, databases, spreadsheets) into Scout. Use scout_tables to inspect the tables that syncs populate.";

export const SCOUT_TRIGGERS_DESCRIPTION =
  "Manage Scout triggers — event-driven hooks that launch workflows or agents in response to external events. Use 'list' to see all triggers, 'create' to define a new trigger, 'update' to modify one, 'delete' to remove one, 'execute_slack' to manually fire a Slack trigger, 'execute_telegram' to fire a Telegram trigger, 'execute_cron' to fire a scheduled cron trigger, or 'update_cron_auth_headers' to update authentication headers for a cron trigger. Triggers connect external systems (Slack, Telegram, cron schedules) to Scout workflows.";

export const SCOUT_COPILOTS_DESCRIPTION =
  "Manage Scout copilots — embeddable AI assistants that can be placed on external websites or applications. Use 'list' to see all copilots, 'get' to inspect one by ID, 'create' to define a new copilot, 'update' to modify an existing copilot's configuration, or 'delete' to remove one. Copilots are configured with agents, appearance settings, and deployment options. Use scout_agents to manage the underlying agent that powers a copilot.";

export const SCOUT_DRIVE_DESCRIPTION =
  "Upload and download files in Scout Drive — the file storage system for assets used by workflows, agents, and copilots. Use 'upload' to store a file (requires data with file content), or 'download' to retrieve a stored file by its file_id. Uploaded files can be referenced by workflows and agents as knowledge sources or attachments.";

export const SCOUT_LOGS_DESCRIPTION =
  "Inspect Scout run logs — execution records for workflows, agents, and syncs. Use 'list' to see recent run logs, or 'get_details' to retrieve full details for a specific log entry including step-level results, errors, and timing. After running a workflow via scout_workflows, use this tool to check whether it succeeded and diagnose any failures. Logs are read-only; they are created automatically when operations execute.";

export const SCOUT_INTEGRATIONS_DESCRIPTION =
  "Manage Scout integrations — connections to external services like Slack. Use 'list' to see all configured integrations, 'list_channels' to discover available Slack channels for integration, or 'delete_integration' to remove an integration by ID. Integrations are required before creating Slack-based triggers via scout_triggers.";

export const SCOUT_USAGE_DESCRIPTION =
  "Retrieve Scout account usage information — shows consumption metrics like workflow runs, agent interactions, and API calls against your plan limits. Use 'get' to fetch the current usage summary. Helpful for monitoring whether you are approaching plan thresholds.";

// ─── Action enum descriptions ───────────────────────────────────────────────

export const WORKFLOWS_ACTION_DESCRIPTION =
  "list: return all workflows; get: return one workflow by ID; create: define a new workflow; run: execute a workflow; run_with_config: execute a workflow with runtime configuration overrides";

export const AGENTS_ACTION_DESCRIPTION =
  "list: return all agents; interact: send a message and receive a streaming response; interact_sync: send a message and receive a complete non-streaming response; upsert: create or update an agent definition";

export const AGENT_SESSIONS_ACTION_DESCRIPTION =
  "interact_with_session: send a message within an existing session, preserving conversation context across turns";

export const COLLECTIONS_ACTION_DESCRIPTION =
  "list: return all collections; get: return one collection by ID; create: define a new collection; update: modify an existing collection; delete: remove a collection; list_views: return all views for a collection; create_view: define a new filtered/sorted view; update_view: modify an existing view; delete_view: remove a view";

export const TABLES_ACTION_DESCRIPTION =
  "list: return all tables in a collection; get: return one table by ID; create: define a new table with a schema; update: modify a table's configuration; delete: remove a table; get_schema: retrieve column definitions for a table; sync: trigger a data sync into the table";

export const DOCUMENTS_ACTION_DESCRIPTION =
  "list: query documents with optional filters; get: retrieve one document by ID; create: insert a new document; update: modify an existing document; delete: remove one document; update_batch: modify multiple documents at once; delete_batch: remove multiple documents";

export const SYNCS_ACTION_DESCRIPTION =
  "list: return all syncs; get: return one sync by ID; create: define a new sync; update: modify an existing sync; delete: remove a sync; execute: run a sync immediately; list_sources: discover available external data sources";

export const TRIGGERS_ACTION_DESCRIPTION =
  "list: return all triggers; create: define a new trigger; update: modify an existing trigger; delete: remove a trigger; execute_slack: manually fire a Slack trigger; execute_telegram: manually fire a Telegram trigger; execute_cron: manually fire a cron trigger; update_cron_auth_headers: update authentication headers for a cron trigger";

export const COPILOTS_ACTION_DESCRIPTION =
  "list: return all copilots; get: return one copilot by ID; create: define a new copilot; update: modify an existing copilot; delete: remove a copilot";

export const DRIVE_ACTION_DESCRIPTION =
  "upload: store a file in Scout Drive; download: retrieve a stored file by file_id";

export const LOGS_ACTION_DESCRIPTION =
  "list: return recent run logs; get_details: retrieve full details for a specific log entry including step results and errors";

export const INTEGRATIONS_ACTION_DESCRIPTION =
  "list: return all configured integrations; list_channels: discover available Slack channels; delete_integration: remove an integration by ID";

export const USAGE_ACTION_DESCRIPTION =
  "get: fetch current account usage summary";

// ─── Parameter descriptions ─────────────────────────────────────────────────

export const WORKFLOW_ID_DESCRIPTION = "The unique identifier of the Scout workflow to operate on";
export const AGENT_ID_DESCRIPTION = "The unique identifier of the Scout agent to interact with";
export const SESSION_ID_DESCRIPTION = "The unique identifier of an existing conversation session with an agent";
export const COLLECTION_ID_DESCRIPTION = "The unique identifier of the Scout collection containing the target tables or views";
export const TABLE_ID_DESCRIPTION = "The unique identifier of the Scout table within a collection that holds the documents";
export const DOCUMENT_ID_DESCRIPTION = "The unique identifier of a specific document (row) within a table";
export const VIEW_ID_DESCRIPTION = "The unique identifier of a collection view to update or delete";
export const SYNC_ID_DESCRIPTION = "The unique identifier of the Scout sync to operate on";
export const TRIGGER_ID_DESCRIPTION = "The unique identifier of the Scout trigger to operate on";
export const COPILOT_ID_DESCRIPTION = "The unique identifier of the Scout copilot to operate on";
export const FILE_ID_DESCRIPTION = "The unique identifier of the file in Scout Drive to download";
export const LOG_ID_DESCRIPTION = "The unique identifier of the run log entry to retrieve details for";
export const INTEGRATION_ID_DESCRIPTION = "The unique identifier of the Scout integration to delete";

export const WORKFLOWS_DATA_DESCRIPTION = "Object containing workflow configuration: for 'create' include name, steps, and settings; for 'run_with_config' include runtime overrides like input values and step parameters";
export const AGENTS_DATA_DESCRIPTION = "Object containing agent interaction or definition data: for 'interact'/'interact_sync' include the user message as input; for 'upsert' include agent config like name, system_prompt, model, and tools";
export const AGENT_SESSIONS_DATA_DESCRIPTION = "Object containing the user message or input to send to the agent in this session turn";
export const COLLECTIONS_DATA_DESCRIPTION = "Object containing collection or view definition: for 'create' include name and settings; for 'update' include fields to change; for 'create_view'/'update_view' include view filters, sorts, and columns";
export const TABLES_DATA_DESCRIPTION = "Object containing table configuration: for 'create' include name and column schema; for 'update' include fields to modify; for 'sync' include sync source and mapping details";
export const DOCUMENTS_DATA_DESCRIPTION = "Object containing document data: for 'create' include field values matching the table schema; for 'update' include fields to change; for 'update_batch' include an array of document updates; for 'delete_batch' include an array of document IDs to remove";
export const SYNCS_DATA_DESCRIPTION = "Object containing sync configuration: for 'create' include source, target table, and mapping; for 'update' include fields to change; for 'execute' include any runtime parameters";
export const TRIGGERS_DATA_DESCRIPTION = "Object containing trigger configuration: for 'create' include type (slack, telegram, cron), workflow_id, and settings; for 'update' include fields to modify; for execute actions include the event payload";
export const COPILOTS_DATA_DESCRIPTION = "Object containing copilot configuration: for 'create' include name, agent_id, and appearance settings; for 'update' include fields to modify";
export const DRIVE_UPLOAD_DATA_DESCRIPTION = "Object containing the file content and metadata to upload to Scout Drive";

export const WORKFLOWS_PARAMS_DESCRIPTION = "Optional query parameters for filtering or pagination when listing workflows (e.g., page, limit, status)";
export const DOCUMENTS_PARAMS_DESCRIPTION = "Optional query parameters for filtering, sorting, or paginating document list results (e.g., page, limit, sort_by, filter expressions)";