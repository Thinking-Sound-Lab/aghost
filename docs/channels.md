# Channels

A workspace connects accounts on Instagram, Facebook, LinkedIn, X, Threads and YouTube through Zernio. Each connected account is a channel, and every channel counts toward the plan's limit, whatever its platform. Comment-to-DM automations, the inbox and contacts stay on Instagram.

## Connecting

Settings → Channels → **Connect channel** lists the platforms. The API asks Zernio for a connect URL with `GET /v1/connect/{platform}` and sends the browser there. Instagram asks for `posting,analytics,comments,messaging`; the other platforms ask for `posting,analytics`. Zernio hosts the extra step for Facebook (choose a Page) and LinkedIn (choose a personal profile or organization page). YouTube connects the channel of the Google identity picked in Google's chooser; one Zernio profile holds one YouTube channel.

The composer's channel menu and schedule dialog connect a channel in a new tab, so the draft stays open; that tab closes itself after the sync, and the composer adds the new account to the post.

After authorization, the callback page syncs the profile's accounts from `GET /v1/accounts`. Accounts on other platforms, and accounts Zernio marks `enabled: false` (such as ones it made for ads), are skipped. Pages and channels without a handle are named by their display name. The `account.connected` and `account.disconnected` webhooks handle every supported platform.

X bills every API call. Zernio refuses to connect X (`402`, `twitter_passthrough`) until the Zernio team has a payment method on file. Zernio's API usage page lists the rates and spend cap.

## Cross-posting

The dashboard composer posts to several accounts at once with `POST /api/scheduled-posts/batch`. Each account gets its own scheduled post and Zernio post, with its own status, link and error, and can then be edited or deleted on its own. All copies are scheduled or none: if one fails, the copies already created are cancelled with their automations.

One caption is shared, and any account can have its own caption instead. A YouTube copy needs a title and an audience setting (made for kids or not). Every copy is checked against its platform before anything is scheduled:

| Platform  | Caption | Media                                           | Text alone |
| --------- | ------- | ----------------------------------------------- | ---------- |
| Instagram | 2,200   | 1–10 photos and videos; stories; Trial Reels    | No         |
| Facebook  | 63,206  | Up to 10 photos, or one video                   | Yes        |
| LinkedIn  | 3,000   | Up to 10 photos, or one video                   | Yes        |
| X         | 280     | Up to 4 photos, or one video                    | Yes        |
| Threads   | 500     | Up to 10 photos and videos                      | Yes        |
| YouTube   | 5,000   | One video, with a title of up to 100 characters | No         |

X allows 25,000 characters on paid accounts, but aghost checks 280 for every X account. Stories, Trial Reels and comment-to-DM automations apply only to the Instagram copies; the composer shows them only when an Instagram account is chosen.

## Analytics

The Analytics page reads any connected account. Instagram keeps its account report: account insights, daily reach, content and posting times ([Instagram analytics](instagram-analytics.md)).

Other platforms have no account insights here. Their totals come from `GET /v1/analytics/daily-metrics` for the account: the lifetime metrics of the posts published in the period, with the platform's main metric charted by publish date. The content table, post details and posting times use the same endpoints as Instagram, filtered to the account's platform.

Each platform reports only some metrics. The rest stay `null` and show as a dash, even when Zernio sends a zero:

| Platform | Impressions | Reach | Views | Likes | Comments | Shares | Saves | Clicks |
| -------- | ----------- | ----- | ----- | ----- | -------- | ------ | ----- | ------ |
| Facebook | Yes         |       | Yes   | Yes   | Yes      | Yes    |       | Yes    |
| LinkedIn | Yes         | Yes   | Yes   | Yes   | Yes      | Yes    | Yes   | Yes    |
| X        | Yes         |       | Yes   | Yes   | Yes      | Yes    |       | Yes    |
| Threads  | Yes         |       | Yes   | Yes   | Yes      | Yes    |       |        |
| YouTube  |             |       | Yes   | Yes   | Yes      | Yes    |       |        |

LinkedIn reports saves for personal profiles only and clicks for organization pages only. Engagement rate needs reach, so only Instagram and LinkedIn show it. The same Zernio Analytics add-on is required.

## Agents

REST and MCP list every account with its `platform`. Scheduled posts carry `accountId` and `platform`; `instagramAccountId` repeats `accountId` for older clients. Agents schedule on every platform with `cross_post` (`POST /api/v1/scheduled-posts/batch`), which takes the composer's body and runs the same checks, and can read, update and delete posts and read analytics on every platform. `schedule_post` publishes on a single Instagram account and refuses others with a validation error.

## Rollout

1. Apply `20261020090000_social_channels.sql`. It adds a `platform` column to accounts (default `instagram`), a platform and YouTube settings to scheduled posts, ties automations to Instagram accounts, adds the Ultimate plan, counts every platform toward the plan's channels (5 / 10 / 30 / 100), and lets the account webhook store every supported platform. The previous API keeps working on it.
2. Deploy the API, then the dashboard. Dashboards from before this change connect Instagram, the only platform they know.
3. Run `pnpm billing:setup` in `live_mode` to update the Dodo products to the new prices and create the two Ultimate products ([billing](billing.md)). Existing subscribers keep their price and get the new channel limits.
4. Add a payment method to the Zernio team before connecting X.

The tests run every platform against a local Zernio fixture and PostgreSQL. They do not prove live publishing or metrics on each platform; check those with a real account on each.
