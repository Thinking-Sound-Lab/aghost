# Instagram content analytics

The dashboard's **Analytics** page reads professional-account insights through
Zernio. This is separate from the application's PostHog product analytics.
This page covers Instagram; [channels](channels.md#analytics) covers Facebook,
LinkedIn, X, Threads and YouTube accounts.

The operator must enable Zernio's Analytics add-on. Instagram connections now
request `posting,analytics,comments,messaging`; existing connections need to
reconnect and grant the insights permission. The page checks account health and
offers reconnection when access is missing. Provider subscription failures show
an availability message without fabricated metrics.

## Data and dates

The 7, 30, and 90 day periods include the current UTC day. Account summary totals
come from Instagram's account insights. In particular, period reach is the
provider's unique-account total, never the sum of post or daily reach. Only reach
is requested as a daily account series. Recent account data may take up to 48
hours to arrive.

The content table lists posts published during the selected period, including
content published directly on Instagram when Zernio has synced it. Its metrics
are lifetime totals. Sorting and pagination run on the provider, not only the
visible page. A content detail shows daily snapshots of cumulative views from
Zernio's timeline; this is not a claim about new views earned on each day.
Content sorting and pagination use `GET /api/insights/content`, keeping the
account summary, reach graph, and posting-time data in place without repeating
account-insights requests. A period change or explicit refresh reloads account
metrics; a UTC date rollover detected during browsing also refreshes the range.

Reel watch-time values are converted from milliseconds into seconds at the
provider boundary. Watch metrics are hidden for other media. Skip rate is Meta's
estimated percentage of initial views skipped in the first three seconds and is
still in development. Engagement rate is `(likes + comments + saves + shares) /
reach * 100`; a zero or unknown denominator is not reported as a rate.

Missing values remain `null`, display as a dash, and leave gaps in the graph.
Reported zeros remain zero. The SVG graphs use ordered Bayer dithering, with
pointer and keyboard inspection and an expandable data table. No chart library
or database migration is required.

## API boundaries and verification

The signed-in dashboard uses `GET /api/insights` and
`GET /api/insights/posts/:id`, `GET /api/insights/content`, and
`GET /api/insights/posting-times`. All resolve the account inside the authenticated
workspace before contacting Zernio. Single-post reads additionally verify the
per-platform account and filter timeline rows to that Instagram post before
returning any metrics.

AI agents have the same four reads through the [REST API](api.md#instagram-analytics) at `/api/v1/insights`, `/api/v1/insights/content`, `/api/v1/insights/posts/:postId`, and `/api/v1/insights/posting-times`. [MCP](mcp.md) exposes `get_account_insights`, `list_content_insights`, `get_post_insights`, and `get_posting_times`. All use the existing `accounts:read` permission, the same insights service and response shapes, and the same workspace, account, and provider access checks. Existing keys with that permission work without a migration. Agents obtain `accountId` from `list_accounts` and post-detail IDs from the analytics content results.

Tests cover real SDK calls against a local HTTP fixture, local Supabase session
and plan checks, cross-workspace refusal, missing versus zero values, watch-time
units, unsupported media metrics, and late UI responses. These checks do not
verify a real account's granted permission or the operator's live Analytics
subscription. Those require a connected-account check.
Agent integration tests also exercise REST and MCP discovery, typed filters, read-only permissions, workspace isolation, provider post ownership, unavailable access, and missing metrics against that fixture.

## Posting-time suggestions

The timing section uses Zernio's `GET /v1/analytics/best-time` with the selected
workspace profile, account, `platform=instagram`, and `source=all`. This endpoint
aggregates all available published-post history; it does not accept date-range
filters. It is independent of the dashboard's 7/30/90-day report filter.

Source slots are Monday=0 through Sunday=6, in UTC. Each carries an average of
likes + comments + shares + saves per post and a post count. The dashboard
suggests up to three positive-engagement slots with at least three posts each,
ordered by average engagement, then sample count. Three posts is an explicit
minimum sample, not a statistical-confidence claim. Sparse slots remain visible
in the dither heatmap with their exact counts, and empty cells mean no history.
No recommendations are fabricated for an empty or insufficient history.

The API returns a reference time. The UI converts each slot's next occurrence
to the browser's local timezone, with a UTC option, preserving half-hour offsets,
day rollover, and daylight-saving changes. The heatmap groups windows by their
local start hour; overlapping hours during a clock change share a cell, whose
tooltip lists each source slot separately. Suggestions are historical signals
for testing, not guaranteed optimal times or causal estimates.

The same Analytics add-on and account permission are required. Add-on errors
(`402`, or `403` with `requiresAddon=true`) show the enablement state. Timing
errors and retries are independent of the main report. Timezone and ranking
tests, stale-response tests, scoped SDK fixture tests, and local HTTP lifecycle
tests cover this flow; real-account timing data still needs a live check.
The local/UTC preference survives period changes, sorting, pagination, and
refreshes, including when the timing section temporarily unmounts.

Follower-online counts are not used: the provider documents their hour-key
timezone as unknown. Historical posting timestamps have a documented UTC base.
Provider reference: https://docs.zernio.com/analytics/get-best-time-to-post
