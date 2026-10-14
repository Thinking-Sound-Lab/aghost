# REST API

Open **Settings → API** (`/settings#api`) and click **+ API key**. Enter a name in the dialog and click **Create key**. Copy and save the key beside the **Copy key** button before closing the dialog; the full key will not be shown again. New keys have full agent access and no expiry. Revoke the key in Settings to stop access.

Save the full token when it is created. Existing keys only show their name, prefix, status, and last use. The database stores a SHA-256 hash of a randomly generated 256-bit token; key data is accessible only to the backend's service role.

The same key works with REST and MCP. Every request resolves its workspace from the key; callers cannot choose another workspace. Revoked keys return 401 on the next request, including requests from an already connected MCP client. Keys created earlier retain their existing restrictions and expiry. API keys cannot create more keys, change workspace settings, or connect or disconnect Instagram accounts.

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
| GET    | `/scheduled-posts?from=&to=`, `/scheduled-posts/:postId`                                                  | `posts:read`        |
| GET    | `/upload-links/:uploadLinkId`                                                                             | `posts:read`        |
| POST   | `/scheduled-posts`, `/media/uploads`, `/upload-links`                                                     | `posts:write`       |
| PATCH  | `/scheduled-posts/:postId`                                                                                | `posts:write`       |
| DELETE | `/scheduled-posts/:postId`                                                                                | `posts:write`       |
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

## Scheduled posts

A scheduled post is a feed post or a story that Zernio publishes on the account at `scheduledFor`, at least five minutes ahead. A `post` with one video publishes as a reel, and 2 to 10 items as a carousel; a `story` has one item and no caption. Media must be at a public `https` URL. To upload a file, ask for an upload URL, then `PUT` the bytes to it with the same `Content-Type` within the hour:

```sh
curl --fail-with-body http://localhost:3000/api/v1/media/uploads \
  -H "Authorization: Bearer $AGHOST_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{ "filename": "launch.jpg", "contentType": "image/jpeg", "size": 482113 }'

curl --fail-with-body -X PUT "$UPLOAD_URL" \
  -H 'Content-Type: image/jpeg' --data-binary @launch.jpg
```

Uploads accept JPEG and PNG photos up to 20 MB and MP4 and MOV videos up to 300 MB. Pass the response's `media` object when scheduling.

An agent that can't send the file itself, because it runs in a sandbox whose network blocks the storage host or because the file is on the user's device, asks the owner to upload it instead. `POST /upload-links` with the body `{}` returns a link whose `url` opens a page in aghost, where the owner signs in, chooses up to 10 photos and videos, and sends them. The page takes files for 24 hours, once. `GET /upload-links/:uploadLinkId` returns its `status`, `waiting`, `uploaded` or `expired`, and once uploaded its `media` in the owner's order, ready to schedule. Creating a link removes the workspace's links older than seven days, after which the provider has deleted unused uploads. Add `automation` to answer the post's comments once it is published; the automation takes the fields of an automation without its account and trigger, and needs `automations:write` as well:

```sh
curl --fail-with-body http://localhost:3000/api/v1/scheduled-posts \
  -H "Authorization: Bearer $AGHOST_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{
    "instagramAccountId": "YOUR_ACCOUNT_UUID",
    "kind": "post",
    "caption": "Comment GUIDE and I will DM you the guide",
    "media": [{ "url": "https://media.zernio.com/temp/launch.jpg", "type": "image" }],
    "scheduledFor": "2026-10-20T09:00:00+05:30",
    "automation": {
      "name": "Guide post",
      "status": "active",
      "keywords": ["guide"],
      "matchMode": "word",
      "openingDm": null,
      "dmMessage": "Here is your guide, {{first_name}}.",
      "dmButtons": [{ "label": "Open guide", "url": "https://example.com/guide" }],
      "commentReply": null,
      "requireFollow": false
    }
  }'
```

The response lists the post's `automationIds`; the automation's trigger is `{ "postScope": "scheduled_post", "scheduledPost": { "id": "…", "caption": "…" } }`. To add an automation while editing a scheduled post, include `automation` in its `PATCH` request. This also needs `automations:write`, and restores the previous content and time if creating the automation fails. To add only an automation, create one with the trigger `{ "postScope": "scheduled_post", "scheduledPostId": "POST_UUID" }`.

`GET /scheduled-posts` takes `from` and `to` as ISO 8601 times up to 92 days apart and returns the posts in that period, earliest first. Reading a post after its time returns its outcome: `published` with `platformPostId` and `permalink`, or `failed` with `error`. Only `scheduled` posts can be changed; `PATCH` replaces `caption`, `media` and `scheduledFor`, and `kind` must stay the same. `DELETE` cancels a scheduled or failed post together with its automations, so a post with automations also needs `automations:write`. Published posts stay on Instagram. When a workspace's plan ends, its posts still waiting to publish are cancelled and kept as `failed`, with the reason in `error`.

An account connected before scheduling was available has not allowed publishing: scheduling on it returns 409 `publishing_not_allowed` until the owner chooses **Reconnect** in Settings → Channels.

Activity pagination defaults to `limit=25&offset=0`. The maximum limit is 50. Contacts use `search` and `offset` and return up to 50 per page. URL-encode opaque conversation IDs when putting them in a path.

Errors have the shape `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`, with `fields` present for validation errors. Missing, invalid, revoked, or expired keys return 401 with a Bearer challenge. A valid key whose workspace has no active plan returns 402 `plan_required` on every request, including the OpenAPI document, until the owner chooses a plan in the app. Insufficient permissions return 403; another workspace's resource returns 404. Validation errors return 422. Provider rate limits and failures preserve the existing API's 429 and 502 responses.

Activating an automation can deliver real DMs and public replies, and a scheduled post publishes at its time. `send_message` sends a real inbox reply and is subject to the provider's messaging restrictions. Writes do not provide an idempotency-key contract: inspect state after an uncertain response instead of automatically retrying creation or message delivery.

## Key management and deployment

Key management remains on cookie-authenticated routes, protected by the existing origin checks. Like the rest of the dashboard, they need an active plan:

- `GET /api/api-keys` lists safe metadata.
- `POST /api/api-keys` accepts `{ "name": "Claude Code" }` and returns `{ key, token }` once. The dashboard sends only the name; the server supplies all agent capabilities and no expiry. An empty `{}` remains valid and uses the default name. Existing API clients can still supply optional `scopes` and `expiresAt`.
- `DELETE /api/api-keys/:id` revokes that workspace's key.

Apply `20261010130000_workspace_api_keys.sql` and `20261014120000_scheduled_posts.sql` before deploying this API version. The second adds the post permissions and grants them to keys that held every permission, or every read permission. No new environment variables or provider credentials are required. The existing `/api` web proxy exposes both endpoints; agents can also call the backend URL directly. Keep production connections on HTTPS.

Agent integration tests exercise key storage and permissions, expiry and revocation, workspace isolation, REST workflows, and both current and 2025 MCP exchanges against local Supabase and a local provider fixture. They send no real Instagram messages.
