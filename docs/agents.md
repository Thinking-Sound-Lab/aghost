# Agent access

REST API and MCP have separate Settings tabs, backend route modules, and setup guides. Both run on the same server and use workspace API keys.

- [REST API](api.md): **Settings → API** (`/settings#api`), key management, REST requests, and OpenAPI at `/api/v1/openapi.json`.
- [MCP](mcp.md): **Settings → MCP** (`/settings#mcp`), client configuration, and tools at `/api/mcp`.

The REST module owns HTTP methods, paths, response statuses, and request conversion. The MCP module owns protocol handling and tool registration. Both reuse the workspace operations, validation, and permission checks in `packages/api/src/modules/agents/`; business and provider rules stay in the API backend.

Agents can analyze the dashboard's [Instagram analytics](api.md#instagram-analytics), including account totals, content performance, individual posts, and historical posting-time samples. These reads reuse `accounts:read` on existing keys.
