# Product analytics

aghost records product analytics in [PostHog](https://posthog.com). The browser records what people see and do; the API records what actually happened, including what agents and webhooks did. Both use the same person, so a visit to the landing page, a sign-up, a checkout and an automation made over MCP form one timeline.

## Setup

1. Create a PostHog project. In its settings, copy the **project API key** (`phc_…`) and the **host**: `https://us.i.posthog.com`, or `https://eu.i.posthog.com` for an EU project.
2. Locally, set `POSTHOG_KEY` and `POSTHOG_HOST` in the root `.env`, then run `pnpm local:start` so the API container gets them. Next.js reads them when it starts.
3. In production, set the same key and host:
   - **Vercel:** `POSTHOG_KEY` and `POSTHOG_HOST` on the `aghost` project, for Production only, so previews do not mix into real numbers. Redeploy, because Next.js reads them at build time.
   - **API on ECS:** the `POSTHOG_KEY` variable of the `prod` GitHub environment. The host is fixed in `infra/lib/config.ts`; change it there for an EU project.
4. In PostHog's project settings, turn on session replay and heatmaps. Workspace-level reports need PostHog's group analytics add-on; everything else works without it.

An empty `POSTHOG_KEY` leaves analytics off: the browser loads no PostHog code and the API records nothing. The project key is public by design, since browsers send events with it; it is not a secret.

## How it works

- **Browser.** `instrumentation-client.ts` starts PostHog before the app hydrates. It records page views and page leaves, clicks and form submissions (autocapture), rage and dead clicks, heatmaps, web vitals, JavaScript errors and, when enabled, session replays.
- **Same-origin relay.** The browser sends events to `/relay`, which `next.config.ts` forwards to PostHog, so ad blockers that know PostHog's addresses do not drop them. Crawlers are kept out of `/relay` in `robots.ts`.
- **API.** Services in `packages/api` record business events through the `ProductAnalytics` port (`modules/analytics/analytics.ts`); the PostHog adapter batches them in the background, so recording never slows or fails a request. The API sends what is queued when it stops. Unexpected API and MCP errors go to PostHog's error tracking.
- **Identity.** The person is the Supabase user. After sign-in the browser identifies itself with that id, which joins the visits made before sign-up to the account. Each event is also grouped by `workspace`. A workspace has one owner, so actions taken with a workspace's API key belong to its owner.
- **Source.** Every API event has a `source` property: `dashboard`, `api` (the REST API), `mcp`, `webhook` (Zernio and Dodo), or `maintenance` (`pnpm billing:reconcile`).
- **Person and workspace properties.** The API sets `email`, `name` and `signed_up_at` at sign-in, and `plan`, `billing_interval`, `subscription_status`, `mrr_usd`, `cancel_at_period_end` and `workspace_name` when they change and whenever the dashboard reads billing, on both the person and the workspace group, so any report can be broken down by plan. Reading billing also fills them in for plans that began before analytics did.

## Events

| Event                                 | When                                                               | Properties                                                                           |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `user_signed_up`                      | A first Google sign-in creates the account                         | `method`                                                                             |
| `user_signed_in`                      | Any later sign-in                                                  | `method`                                                                             |
| `workspace_renamed`                   | The owner renames the workspace                                    |                                                                                      |
| `checkout_started`                    | Checkout opens for a plan                                          | `plan`, `billing_interval`, `price_usd`, `resumed` (an unpaid checkout reopened)     |
| `plan_change_requested`               | A subscriber asks to change plan                                   | `plan`, `billing_interval`, `from_plan`, `from_billing_interval`, `payment_required` |
| `billing_portal_opened`               | The owner opens Manage billing                                     |                                                                                      |
| `subscription_started`                | The workspace gains a plan, first time or again                    | subscription properties, `previous_status`                                           |
| `subscription_renewed`                | A paid period renews                                               | subscription properties                                                              |
| `subscription_plan_changed`           | The plan or interval changes                                       | subscription properties, `from_plan`, `from_billing_interval`, `previous_mrr_usd`    |
| `subscription_cancellation_scheduled` | The plan is set to end at the period's end                         | subscription properties                                                              |
| `subscription_cancellation_withdrawn` | A scheduled cancellation is undone                                 | subscription properties                                                              |
| `subscription_status_changed`         | Any other status change, such as `past_due` after a failed payment | subscription properties, `previous_status`                                           |
| `subscription_ended`                  | The workspace loses its plan                                       | subscription properties, `previous_mrr_usd`                                          |
| `instagram_connect_started`           | The owner starts connecting an Instagram account                   |                                                                                      |
| `instagram_reconnect_started`         | The owner authorizes a stored account again                        | `account_id`                                                                         |
| `instagram_account_connected`         | An account becomes connected                                       | `account_id`                                                                         |
| `instagram_account_limit_reached`     | An account is refused because the plan has no room for it          | `account_id`, null when the connection was refused before Instagram authorization    |
| `instagram_account_disconnected`      | A connected account stops working                                  | `account_id`, `reason`                                                               |
| `instagram_account_removed`           | The owner removes an account                                       | `account_id`                                                                         |
| `automation_created`                  | An automation is created                                           | automation properties                                                                |
| `automation_updated`                  | An automation is edited                                            | automation properties                                                                |
| `automation_activated`                | An automation starts running, including when it is created active  | `automation_id`                                                                      |
| `automation_paused`                   | A running automation stops                                         | `automation_id`, `reason` (`owner`, or `plan` when billing paused it)                |
| `automation_deleted`                  | An automation is deleted                                           | `automation_id`, `reason` (`owner`, `account_removed` or `post_deleted`)             |
| `post_scheduled`                      | A post is scheduled                                                | post properties                                                                      |
| `scheduled_post_updated`              | A scheduled post is edited                                         | post properties                                                                      |
| `scheduled_post_published`            | A post is first read as published after its time                   | `post_id`                                                                            |
| `scheduled_post_failed`               | A post did not publish, or the plan ended before its time          | `post_id`, `reason` (`publishing` or `plan`)                                         |
| `scheduled_post_deleted`              | A scheduled or failed post is cancelled                            | `post_id`, `reason` (`owner` or `account_removed`)                                   |
| `upload_link_completed`               | The owner sends files through a link an agent gave them            | `upload_link_id`, `media_count`, `video_count`                                       |
| `inbox_message_sent`                  | A reply is sent from the inbox                                     | `account_id`                                                                         |
| `api_key_created`                     | An API key is created; `source` is `mcp` when an MCP app signs in  | `api_key_id`, `scope_count`, `expires`                                               |
| `api_key_revoked`                     | An API key is revoked                                              | `api_key_id`                                                                         |
| `agent_tool_called`                   | An agent calls a REST operation or MCP tool; `source` says which   | `tool`, `api_key_id`, `outcome`, `error_code`, `duration_ms`                         |

Subscription properties are `subscription_id` (Dodo's), `plan`, `billing_interval`, `status`, `price_usd` (the list price for one period) and `mrr_usd` (monthly recurring revenue at the plan's list price, zero once the plan has ended; a subscription kept on an older price after a price change is counted at the new one). Automation properties describe its shape, never its messages: `automation_id`, `status`, `post_scope`, `match_mode`, `keyword_count`, `has_opening_dm`, `button_count`, `has_comment_reply`, `requires_follow` and `has_not_following_message`. Post properties likewise leave out the caption and media: `post_id`, `kind`, `media_count`, `video_count`, `has_caption` and `has_automation`.

A subscription change is recorded once, after it is saved, even when a webhook and a dashboard refresh see it at the same time. Account connections are recorded by whichever of the post-authorization sync and Zernio's webhook stores them first.

## Questions these answer

- **Acquisition:** which pages, referrers and campaigns bring visitors who sign up and pay: `$pageview` → `user_signed_up` → `checkout_started` → `subscription_started`, broken down by initial referrer or UTM source.
- **Activation:** how many new workspaces connect Instagram and run an automation, and how long it takes: `subscription_started` → `instagram_account_connected` → `automation_activated`.
- **Agentic use:** the share of automations created by agents rather than the dashboard (`automation_created` by `source`), which tools agents use, and which fail (`agent_tool_called` by `tool` and `outcome`).
- **Revenue and churn:** MRR from `mrr_usd`, plan mix, failed payments (`subscription_status_changed` to `past_due`), scheduled cancellations and ended plans.
- **Upgrades:** workspaces that hit their plan's account limit (`instagram_account_limit_reached`) and whether they then change plan.
- **Quality:** errors by page or tool, slow pages from web vitals, rage clicks, and session replays of the moments before someone gave up.

## Privacy

- Instagram users' messages, names, contacts and comment activity are marked `ph-no-capture` in the dashboard, so session replays show a placeholder and autocapture records no text from them. The one-time API key is marked the same way.
- Session replays mask every input by default.
- API events carry ids and counts, never message text, captions or link URLs.
- Server events do not set a location: GeoIP is off for them, so the API's own address never replaces the visitor's.
- Anonymous visitors do not get person profiles until they sign in.

## Adding an event

Add it to `Events` in `packages/api/src/modules/analytics/analytics.ts`, with its properties, and record it from the service where the change happens with `this.analytics.capture(actorOf(workspace), { name, ...properties })`. Record it after the change has been saved, and add it to the table above.
