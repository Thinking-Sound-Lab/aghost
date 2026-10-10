# MCP

Open **Settings → MCP** (`/settings#mcp`) for your endpoint and client configuration. Create and save a key in **Settings → API** first. [API keys and permissions](api.md) control the tools an agent can use; expired or revoked keys stop working on the next exchange.

Use **Copy skill** or **Download SKILL.md** to give your agent setup instructions. The file includes the configured app URL and guidance for Claude Code, Codex, Cursor, and agents using REST. It uses environment references for credentials. The agent needs an existing workspace API key or asks the user to create one; it does not generate credentials itself.

`GET /api/mcp/skill.md` is a public Markdown download containing setup instructions only. It includes no workspace data or secrets. The maintained source is `packages/api/src/mcp/skills/aghost/SKILL.md`; the backend substitutes the configured app URL when serving it.

The endpoint is `<APP_URL>/api/mcp`. It uses the [official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), serves the current per-request protocol and the 2025 stateless HTTP handshake, and needs no sticky sessions. Use a client that supports HTTP MCP and Bearer tokens or custom headers. OAuth-based MCP account linking is not implemented.

For JSON-configured clients that support this format:

```json
{
  "mcpServers": {
    "aghost": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Use your hosted app's URL in place of localhost for remote access. Store the key using your client's secret or environment variable support when available. Tools are advertised only when the key has the required permission:

| Permission          | MCP tools                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `workspace:read`    | `get_workspace`                                                                          |
| `accounts:read`     | `list_accounts`, `list_account_posts`                                                    |
| `automations:read`  | `list_automations`, `get_automation`, `get_automation_stats`, `list_automation_activity` |
| `automations:write` | `create_automation`, `update_automation`, `set_automation_status`, `delete_automation`   |
| `contacts:read`     | `list_contacts`                                                                          |
| `inbox:read`        | `list_conversations`, `list_messages`                                                    |
| `inbox:write`       | `send_message`                                                                           |

Tools return readable JSON text and `structuredContent.data`. Application failures return `isError` with the API error code and message. The SDK handles protocol and input-schema errors.

Read accounts first to get an `instagramAccountId`. For a specific post, read that account's recent posts and use its `platformPostId`.

- `create_automation` takes the full configuration shown in the [REST API example](api.md#rest).
- `update_automation` takes `{ "automationId": "...", "input": { ...full configuration... } }`. Read the automation first to preserve fields you are not changing. Convert a returned specific-post trigger's `trigger.post.platformPostId` to the input's `trigger.platformPostId`.
- `set_automation_status` takes `{ "automationId": "...", "status": "active" }` or `paused`.
- `list_automation_activity` takes `{ "automationId": "...", "limit": 25, "offset": 0 }`, with a maximum limit of 50. Advance the offset by the number of returned entries while `hasMore` is true.
- `list_contacts` takes `search` and `offset`, returning up to 50 contacts per page.
- Message tools take `accountId` and the unchanged `conversationId` returned by `list_conversations`. `send_message` also takes `text`.

Activating automations and sending inbox replies can deliver real messages. Writes do not provide an idempotency-key contract: inspect state after an uncertain response instead of automatically retrying creation or message delivery.

## Deployment and verification

The MCP module (`packages/api/src/mcp/`) registers its own routes on the same server as the REST API. Its tool definitions use shared workspace operations and key authentication, independently of REST paths and request conversion. No additional service or environment variables are required. Apply the [API key migration](api.md#key-management-and-deployment) before deploying.

Integration tests use a real MCP SDK client and verify tool permissions, workspace isolation, automation workflows, expiry, revocation, and the 2025 handshake. Provider writes use a local fixture; they send no real Instagram messages.
