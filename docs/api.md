# REST API

Create a key in **Settings → API** (`/settings#api`). Read permissions are selected initially; enable **Create, edit, activate, and delete automations** to let an agent manage automations. Sending inbox messages is a separate permission. The UI offers 30-day, 90-day, or one-year expiry and revocation.

Save the full token when it is created. Existing keys only show their name, prefix, permissions, expiry, and last use. The database stores a SHA-256 hash of a randomly generated 256-bit token; key data is accessible only to the backend's service role.

The same key works with REST and MCP. Every request resolves its workspace from the key; callers cannot choose another workspace. Revoked and expired keys return 401 on the next request, including requests from an already connected MCP client. API keys cannot create more keys, change workspace settings, or connect or disconnect Instagram accounts.

## REST

Send `Authorization: Bearer <key>` on every request and `Content-Type: application/json` on writes. Agent clients do not need an Origin header; browser requests with a foreign Origin are rejected. The existing cookie-authenticated browser routes retain their origin checks.

```sh
curl --fail-with-body http://localhost:3000/api/v1/automations \
  -H "Authorization: Bearer $AGHOST_API_KEY"

curl --fail-with-body http://localhost:3000/api/v1/openapi.json \
  -H "Authorization: Bearer $AGHOST_API_KEY"
```

`GET /api/v1/openapi.json` returns an OpenAPI 3.1 document generated from the shared operation schemas. It describes request bodies, parameters, errors, and required permissions. Resource responses use the same JSON shape as the dashboard API; empty successful writes return 204.

| Method | Path under `/api/v1`                                                                                      | Permission          |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------- |
| GET    | `/workspace`                                                                                              | `workspace:read`    |
| GET    | `/accounts`, `/accounts/:accountId/posts`                                                                 | `accounts:read`     |
| GET    | `/automations`, `/automations/stats`, `/automations/:automationId`, `/automations/:automationId/activity` | `automations:read`  |
| POST   | `/automations`                                                                                            | `automations:write` |
| PATCH  | `/automations/:automationId`, `/automations/:automationId/status`                                         | `automations:write` |
| DELETE | `/automations/:automationId`                                                                              | `automations:write` |
| GET    | `/contacts?search=&offset=0`                                                                              | `contacts:read`     |
| GET    | `/inbox`, `/inbox/:accountId/:conversationId`                                                             | `inbox:read`        |
| POST   | `/inbox/:accountId/:conversationId`                                                                       | `inbox:write`       |

For example, create a paused automation on any post:

```sh
curl --fail-with-body http://localhost:3000/api/v1/automations \
  -H "Authorization: Bearer $AGHOST_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{
    "instagramAccountId": "YOUR_ACCOUNT_UUID",
    "name": "Send the guide",
    "status": "paused",
    "trigger": { "postScope": "any_post" },
    "keywords": ["guide"],
    "matchMode": "word",
    "openingDm": null,
    "dmMessage": "Here is your guide, {{first_name}}.",
    "dmButtons": [{ "label": "Open guide", "url": "https://example.com/guide" }],
    "commentReply": null,
    "requireFollow": false
  }'
```

Activity pagination defaults to `limit=25&offset=0`. The maximum limit is 50. Contacts use `search` and `offset` and return up to 50 per page. URL-encode opaque conversation IDs when putting them in a path.

Errors have the shape `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`, with `fields` present for validation errors. Missing, invalid, revoked, or expired keys return 401 with a Bearer challenge. Insufficient permissions return 403; another workspace's resource returns 404. Validation errors return 422. Provider rate limits and failures preserve the existing API's 429 and 502 responses.

Activating an automation can deliver real DMs and public replies. `send_message` sends a real inbox reply and is subject to the provider's messaging restrictions. Writes do not provide an idempotency-key contract: inspect state after an uncertain response instead of automatically retrying creation or message delivery.

## Key management and deployment

Key management remains on cookie-authenticated routes, protected by the existing origin checks:

- `GET /api/api-keys` lists safe metadata.
- `POST /api/api-keys` takes `{ name, scopes, expiresAt }` and returns `{ key, token }` once. `expiresAt` can be a future ISO timestamp or null for no expiry.
- `DELETE /api/api-keys/:id` revokes that workspace's key.

Apply `20261010130000_workspace_api_keys.sql` before deploying this API version. No new environment variables or provider credentials are required. The existing `/api` web proxy exposes both endpoints; agents can also call the backend URL directly. Keep production connections on HTTPS.

Agent integration tests exercise key storage and permissions, expiry and revocation, workspace isolation, REST workflows, and both current and 2025 MCP exchanges against local Supabase and a local provider fixture. They send no real Instagram messages.
