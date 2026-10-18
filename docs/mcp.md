# MCP

Open **Settings → MCP** (`/settings#mcp`) for your endpoint and client configuration. Click **+ API key** in **Settings → API**, enter a name, and save the key shown once in the dialog. [New API keys](api.md) have full agent access and no expiry; revoked keys stop working on the next exchange.

Use **Copy skill** to give your agent setup instructions. The copied text includes the configured app URL and guidance for Claude Code, Codex, Cursor, and agents using REST. It uses environment references for credentials. The agent needs an existing workspace API key or asks the user to create one; it does not generate credentials itself.

`GET /api/mcp/skill.md` is a public Markdown download containing setup instructions only. It includes no workspace data or secrets. The maintained source is `packages/api/src/mcp/skills/aghost/SKILL.md`; the backend substitutes the configured app URL when serving it.

The endpoint is `<APP_URL>/api/mcp`. It uses the [official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), serves the current per-request protocol and the 2025 stateless HTTP handshake, and needs no sticky sessions. Clients either sign in with OAuth or send an API key as a Bearer token.

## Connect with sign-in

Apps that sign in to MCP servers, such as Claude (**Customize → Connectors → Add custom connector**), need only the URL `<APP_URL>/api/mcp`. Leave the OAuth client ID and secret empty. The app registers itself, the browser opens aghost, and the owner chooses **Allow** for their workspace. The app then receives a full-access workspace API key named after it. It appears in **Settings → API**, and revoking it there disconnects the app.

aghost is the app's OAuth 2.1 authorization server:

- An unauthenticated MCP request is answered `401` with `WWW-Authenticate: Bearer resource_metadata="<APP_URL>/.well-known/oauth-protected-resource/api/mcp"`. That document (RFC 9728) names `<APP_URL>` as the issuer, whose metadata is at `/.well-known/oauth-authorization-server` (RFC 8414). The web app forwards both paths to the API.
- `POST /api/oauth/register` is dynamic client registration (RFC 7591). Public clients use `token_endpoint_auth_method: "none"`; others receive a secret for `client_secret_basic` or `client_secret_post`. Redirect addresses must use https, an app's own scheme, or http on `localhost`, `127.0.0.1` or `[::1]`, where any port matches the registered address (RFC 8252).
- Registration is limited to 60 clients per rolling minute across all API replicas. Excess requests receive `429` with `Retry-After: 60`. Each registration also removes clients older than a day that never completed sign-in and have no unexpired consent request or approved code; clients that have signed in remain registered.
- `GET /api/oauth/authorize` requires S256 PKCE and a registered redirect address. It sends the browser to the consent page at `/authorize`, through Google sign-in when needed. A workspace without a plan cannot approve, but can send the app back with `access_denied`.
- Choosing a plan preserves the pending connection in the current tab through checkout, then returns to consent after the plan activates. Consent requests expire after ten minutes; an expired return asks the owner to restart connecting from the app.
- `POST /api/oauth/token` accepts form-encoded `authorization_code` grants. A code works once, within five minutes of approval. The response has no `refresh_token` or `expires_in`: the key works until the owner revokes it, and the app signs in again after a `401`.
- An optional `resource` parameter (RFC 8707) must be the MCP endpoint. Responses to the app carry `iss` (RFC 9207).

## Connect with an API key

Use a client that supports HTTP MCP and Bearer tokens or custom headers.

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

Use your hosted app's URL in place of localhost for remote access. Store the key using your client's secret or environment variable support when available. New keys can use all the tools below. The backend retains capability checks for previously issued restricted keys:

| Permission          | MCP tools                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `workspace:read`    | `get_workspace`                                                                                                |
| `accounts:read`     | `list_accounts`, `list_account_posts`                                                                          |
| `automations:read`  | `list_automations`, `get_automation`, `get_automation_stats`, `list_automation_activity`                       |
| `automations:write` | `create_automation`, `update_automation`, `set_automation_status`, `delete_automation`                         |
| `posts:read`        | `list_scheduled_posts`, `get_scheduled_post`, `get_upload_link`                                                |
| `posts:write`       | `create_media_upload`, `create_upload_link`, `schedule_post`, `update_scheduled_post`, `delete_scheduled_post` |
| `contacts:read`     | `list_contacts`                                                                                                |
| `inbox:read`        | `list_conversations`, `list_messages`                                                                          |
| `inbox:write`       | `send_message`                                                                                                 |

Tools return readable JSON text and `structuredContent.data`. Application failures return `isError` with the API error code and message. The SDK handles protocol and input-schema errors. While the workspace has no active plan, the endpoint itself answers 402 `plan_required`, so a client can neither connect nor call tools until the owner chooses a plan in the app.

Read accounts first to get an `instagramAccountId`. For a specific post, read that account's recent posts and use its `platformPostId`.

- `create_automation` takes the full configuration shown in the [REST API example](api.md#rest).
- `update_automation` takes `{ "automationId": "...", "input": { ...full configuration... } }`. Read the automation first to preserve fields you are not changing. Convert a returned specific-post trigger's `trigger.post.platformPostId` to the input's `trigger.platformPostId`.
- `set_automation_status` takes `{ "automationId": "...", "status": "active" }` or `paused`.
- `list_automation_activity` takes `{ "automationId": "...", "limit": 25, "offset": 0 }`, with a maximum limit of 50. Advance the offset by the number of returned entries while `hasMore` is true.
- `schedule_post` takes the body of the [REST example](api.md#scheduled-posts), including an optional `automation`, which also needs `automations:write`. Upload local files with `create_media_upload` first and pass its `media` objects.
- To create a Trial Reel, use `schedule_post` with `kind: "post"`, one video, and `trialReel: { "graduationStrategy": "manual" }` or `"automatic"`. Manual sharing happens later in Instagram; automatic sharing is decided by Instagram based on performance with non-followers. Attach `automation` in the same call. `update_scheduled_post` accepts the same trial settings: omit `trialReel` to keep them or pass `null` to make a regular reel. Returned settings describe launch intent, not current graduation status. See [Trial Reels](api.md#trial-reels).
- An agent that can't reach the storage address `create_media_upload` returns, such as one in a sandbox that allows only some hosts, or whose files are on the user's device, calls `create_upload_link` instead. It returns a `url` for the user to open; they upload the files in their browser and choose **Send to agent**. The agent then calls `get_upload_link` with `{ "uploadLinkId": "..." }` and passes its `media` to `schedule_post` once `status` is `uploaded`.
- `update_scheduled_post` takes `{ "postId": "...", "input": { "kind", "caption", "media", "scheduledFor" } }`; `kind` cannot change. Include an optional `automation` in `input` to add it together with the post changes; this requires `automations:write` and restores the previous post if automation creation fails. `delete_scheduled_post` also needs `automations:write` when the post has automations. `list_scheduled_posts` takes `from` and `to`, up to 92 days apart.
- `list_contacts` takes `search` and `offset`, returning up to 50 contacts per page.
- Message tools take `accountId` and the unchanged `conversationId` returned by `list_conversations`. `send_message` also takes `text`.

Activating automations and sending inbox replies can deliver real messages, and scheduled posts publish at their time. Writes do not provide an idempotency-key contract: inspect state after an uncertain response instead of automatically retrying creation or message delivery.

## Deployment and verification

The MCP module (`packages/api/src/mcp/`) registers its own routes on the same server as the REST API. Its tool definitions use shared workspace operations and key authentication, independently of REST paths and request conversion. Sign-in lives in `packages/api/src/modules/oauth/`, with its clients and pending approvals in the `oauth_clients` and `oauth_authorizations` tables, which only the backend can reach. No additional service or environment variables are required. Apply the [API key migration](api.md#key-management-and-deployment) and the OAuth migration before deploying the API, and deploy the web app for the discovery rewrites in `next.config.ts`.

Integration tests use a real MCP SDK client and verify tool permissions, workspace isolation, automation workflows, expiry, revocation, and the 2025 handshake. The OAuth tests have the same client discover, register, sign in and call a tool, and check redirect, PKCE, code reuse and client authentication rules. Provider writes use a local fixture; they send no real Instagram messages.
