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
| GET    | `/insights`, `/insights/content`, `/insights/posts/:postId`, `/insights/posting-times`                    | `accounts:read`     |
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

## Instagram analytics

Agents can read the same [Analytics reports](instagram-analytics.md) as the dashboard, for an account on any platform. All four reads use `accounts:read`, including on existing keys; no new key is needed. Read `/accounts` first and pass its workspace account `id` as `accountId`. A ready report has `platform`: Instagram reports have `summary` and `dailyReach`; other platforms have `totals`, `postCount`, `dailyMetric` and `daily`, built from the posts published in the period ([channels](channels.md#analytics)). `sort` also accepts `impressions`, `likes`, `comments` and `clicks`; metrics a platform doesn't report are `null`.

| GET path under `/api/v1`  | Parameters                          | Result                                                                                          |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/insights`               | `accountId`, `days`, `page`, `sort` | Account totals, daily reach, and a page of published content                                    |
| `/insights/content`       | `accountId`, `days`, `page`, `sort` | Published content with lifetime metrics and pagination, without reloading account totals        |
| `/insights/posts/:postId` | `accountId`, `days`                 | One post's lifetime metrics and cumulative view snapshots                                       |
| `/insights/posting-times` | `accountId`                         | Historical engagement samples by UTC weekday/hour, sample counts, and a timezone reference time |

`days` is 7, 30 (default), or 90, including today in UTC. `page` starts at 1 (default), and `sort` is `views` (default), `reach`, `saves`, `shares`, or `date`. Continue through the returned `pages` to analyze more than the first content page. The post-detail `postId` is the opaque `posts[].id` from an analytics report, not a scheduled-post UUID or `platformPostId`; URL-encode it in the path.

```sh
curl --fail-with-body 'http://localhost:3000/api/v1/insights?accountId=YOUR_ACCOUNT_UUID&days=30' \
  -H "Authorization: Bearer $AGHOST_API_KEY"
```

Responses preserve the dashboard's JSON shape and metric meanings. Account summary totals cover the selected period; unique reach must not be summed across days or posts. Post metrics are lifetime totals for posts published in the selected range, and view-history points are cumulative snapshots, not daily increments. Reel watch time is in seconds. `null` is unknown, not zero. Recent account data can lag up to 48 hours.

Posting-time slots use all available post history and have no date filter. `dayOfWeek` is Monday=0 through Sunday=6, `hour` is UTC, `averageEngagement` is mean likes + comments + shares + saves per post, and `postCount` is the sample size. Use `referenceTime` to convert a slot's next occurrence into the user's timezone. Suggestions should require positive engagement and at least three posts per slot; they are historical signals, not guaranteed optimal times.

The workspace still needs an active plan, the operator's Zernio Analytics add-on, and a connected Instagram account with insights permission. Missing provider access returns HTTP 200 with `status: "reconnect_required"` or `"not_enabled"`, rather than fabricated metrics; usable reports have `status: "ready"`. Other errors use the standard API error response. Account and post ownership checks are shared with the dashboard.

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

Accounts and scheduled posts can be on Instagram, Facebook, LinkedIn, X, Threads or YouTube: `GET /accounts` returns each account's `platform`, and each scheduled post has `accountId` and `platform` (`instagramAccountId` repeats `accountId` for older clients). `POST /scheduled-posts/batch` (MCP `cross_post`) schedules one post on one or more accounts on any platform, taking the dashboard's cross-post body: `targets` of `{ "accountId", "caption", "youtube" }` plus the shared content ([channels](channels.md)). `POST /scheduled-posts` publishes on a single Instagram account. `PATCH` and `DELETE` work on every platform, under that platform's limits; a YouTube post takes `youtube: { "title", "madeForKids" }`, kept when omitted.

`GET /scheduled-posts` takes `from` and `to` as ISO 8601 times up to 92 days apart and returns the posts in that period, earliest first. Reading a post after its time returns its outcome: `published` with `platformPostId` and `permalink`, or `failed` with `error`. Only `scheduled` posts can be changed; `PATCH` replaces `caption`, `media` and `scheduledFor`, and `kind` must stay the same. `DELETE` cancels a scheduled or failed post together with its automations, so a post with automations also needs `automations:write`. Published posts stay on their platform. When a workspace's plan ends, its posts still waiting to publish are cancelled and kept as `failed`, with the reason in `error`.

### Trial Reels

In the dashboard, open **Calendar → New post**, enable **Trial Reel**, upload one video, and choose manual or automatic sharing. Set the date and time and optionally enable **Send a DM to people who comment** before scheduling. Existing scheduled reels can also be changed to trials before they publish.

Agents use the same `POST /scheduled-posts` endpoint (or MCP `schedule_post`). Set `kind: "post"`, exactly one video in `media`, and:

```json
{
  "trialReel": { "graduationStrategy": "manual" }
}
```

`manual` lets the owner share the reel with everyone later in Instagram. `automatic` lets Instagram decide whether to share it with everyone based on performance with non-followers. Photos, carousels, and stories cannot be Trial Reels. The optional `automation` works the same way as for a regular reel, including the additional `automations:write` permission.

Omit `trialReel` or use `null` to schedule a regular post. On `PATCH /scheduled-posts/:postId`, omitting it preserves the existing setting; explicit `null` turns a waiting trial into a regular reel, and an object changes its sharing strategy. An inherited trial still requires one video. If an attached automation cannot be created, the previous content and trial settings are restored together.

List, create, get, and update responses include `trialReel` (`null` for regular posts). It records how the reel was configured to launch. Instagram does not expose its current graduation state; a published trial may already have been shared with everyone. Check Instagram for that status.

Apply `20261018090000_trial_reels.sql`, deploy all API replicas, then deploy the dashboard. The migration adds a nullable column and preserves existing posts. No new provider credentials are needed. Provider fixtures verify the request shape and automation binding; real Trial Reel publication and comment-to-DM delivery still require an authorized Instagram account test.

An account connected before scheduling was available has not allowed publishing: scheduling on it returns 409 `publishing_not_allowed` until the owner chooses **Reconnect** in Settings → Channels.

Activity pagination defaults to `limit=25&offset=0`. The maximum limit is 50. Contacts use `search` and `offset` and return up to 50 per page. URL-encode opaque conversation IDs when putting them in a path.

Growth and Business can set `productCarousel` to 1–10 cards. Each card has `title` (up to 80 characters), `subtitle` (up to 80), an HTTPS `imageUrl`, `buttonLabel` (up to 20), and an HTTPS `url`. Set `dmButtons: []`: the carousel replaces the main text bubble. `dmMessage` remains the fallback when the carousel is cleared.

Business can set `followUp` to `{ "message": "Still interested?", "delayMinutes": 60, "button": { "label": "View offer", "url": "https://example.com/offer" } }`. `button` is optional or null; the message is at most 640 characters and the delay is 30–1200 minutes. Replies, tracked clicks, conversation activity and Instagram's messaging window determine whether the reminder is sent. An opening DM lets commenters opt in before the offer arrives. Apply the feature migration and subscribe to message webhooks as described in [billing](billing.md#carousel-and-follow-up-rollout).

Both fields are optional on create and update. Omitted fields on an update keep the current settings; explicit `null` clears them. Feature permissions are enforced before provider writes; unavailable features return 403 `plan_limit_reached`. Activity also returns `followUps`, the latest 50 reminder outcomes with status, due/sent time and skip reason.

Errors have the shape `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`, with `fields` present for validation errors. Missing, invalid, revoked, or expired keys return 401 with a Bearer challenge. A valid key whose workspace has no active plan returns 402 `plan_required` on every request, including the OpenAPI document, until the owner chooses a plan in the app. Insufficient permissions return 403; another workspace's resource returns 404. Validation errors return 422. Provider rate limits and failures preserve the existing API's 429 and 502 responses.

Activating an automation can deliver real DMs and public replies, and a scheduled post publishes at its time. `send_message` sends a real inbox reply and is subject to the provider's messaging restrictions. Writes do not provide an idempotency-key contract: inspect state after an uncertain response instead of automatically retrying creation or message delivery.

## Key management and deployment

Key management remains on cookie-authenticated routes, protected by the existing origin checks. Like the rest of the dashboard, they need an active plan:

- `GET /api/api-keys` lists safe metadata.
- `POST /api/api-keys` accepts `{ "name": "Claude Code" }` and returns `{ key, token }` once. The dashboard sends only the name; the server supplies all agent capabilities and no expiry. An empty `{}` remains valid and uses the default name. Existing API clients can still supply optional `scopes` and `expiresAt`.
- `DELETE /api/api-keys/:id` revokes that workspace's key.

Apply `20261010130000_workspace_api_keys.sql` and `20261014120000_scheduled_posts.sql` before deploying this API version. The second adds the post permissions and grants them to keys that held every permission, or every read permission. No new environment variables or provider credentials are required. The existing `/api` web proxy exposes both endpoints; agents can also call the backend URL directly. Keep production connections on HTTPS.

Agent integration tests exercise key storage and permissions, expiry and revocation, workspace isolation, REST workflows, and both current and 2025 MCP exchanges against local Supabase and a local provider fixture. They send no real Instagram messages.
