# Channels

A workspace connects accounts on Instagram, Facebook, LinkedIn, X, Threads and YouTube through Zernio. Each connected account is a channel, and belongs to a [social set](#social-sets). Comment-to-DM automations, the inbox and contacts stay on Instagram.

## Connecting

Settings → Channels → **Connect channel** lists the platforms. The API asks Zernio for a connect URL with `GET /v1/connect/{platform}` and sends the browser there. Instagram asks for `posting,analytics,comments,messaging`; the other platforms ask for `posting,analytics`. Zernio hosts the extra step for Facebook (choose a Page) and LinkedIn (choose a personal profile or organization page). YouTube connects the channel of the Google identity picked in Google's chooser; one Zernio profile holds one YouTube channel.

The composer's channel menu and schedule dialog connect a channel in a new tab, so the draft stays open; that tab closes itself after the sync, and the composer adds the new account to the post.

After authorization, the callback page syncs the profile's accounts from `GET /v1/accounts`. Accounts on other platforms, and accounts Zernio marks `enabled: false` (such as ones it made for ads), are skipped. Pages and channels without a handle are named by their display name. The `account.connected` and `account.disconnected` webhooks handle every supported platform.

X bills every API call. Zernio refuses to connect X (`402`, `twitter_passthrough`) until the Zernio team has a payment method on file. Zernio's API usage page lists the rates and spend cap.

## Cross-posting

The dashboard composer posts to several accounts at once with `POST /api/scheduled-posts/batch`. Each account gets its own scheduled post and Zernio post, with its own status, link and error, and can then be edited or deleted on its own. All copies are scheduled or none: if one fails, the copies already created are cancelled with their automations.

One caption is shared, and any account can have its own caption instead. A YouTube copy needs a title and an audience setting (made for kids or not). A Facebook copy is a feed post or, from one vertical video of 3 to 90 seconds, a reel; Zernio publishes it with `contentType: "reel"`. That choice is made when the post is scheduled and can't change afterwards. Every copy is checked against its platform before anything is scheduled:

| Platform  | Caption | Media                                           | Text alone |
| --------- | ------- | ----------------------------------------------- | ---------- |
| Instagram | 2,200   | 1–10 photos and videos; stories; Trial Reels    | No         |
| Facebook  | 63,206  | Up to 10 photos, or one video; reels            | Yes        |
| LinkedIn  | 3,000   | Up to 10 photos, or one video                   | Yes        |
| X         | 280     | Up to 4 photos, or one video                    | Yes        |
| Threads   | 500     | Up to 10 photos and videos                      | Yes        |
| YouTube   | 5,000   | One video, with a title of up to 100 characters | No         |

X allows 25,000 characters on paid accounts, but aghost checks 280 for every X account. Stories, Trial Reels and comment-to-DM automations apply only to the Instagram copies; the composer shows them only when an Instagram account is chosen.

## Analytics

The Analytics page shows the chosen social set: an All tab with the set's totals and each channel side by side, then a tab per channel. Instagram keeps its account report: account insights, daily reach and content ([Instagram analytics](instagram-analytics.md)).

Other platforms have no account insights here. Their totals add up the account's posts from `GET /v1/analytics`, every page of them: the lifetime metrics of the posts published in the period, with the platform's main metric charted by publish date. Zernio's `daily-metrics` rollup trails its post sync by hours, so it isn't used. The content table and post details use the same endpoints as Instagram, filtered to the account's platform.

Each platform reports only some metrics. The rest stay `null` and show as a dash, even when Zernio sends a zero:

| Platform | Impressions | Reach | Views | Likes | Comments | Shares | Saves | Clicks |
| -------- | ----------- | ----- | ----- | ----- | -------- | ------ | ----- | ------ |
| Facebook | Yes         |       | Yes   | Yes   | Yes      | Yes    |       | Yes    |
| LinkedIn | Yes         | Yes   | Yes   | Yes   | Yes      | Yes    | Yes   | Yes    |
| X        | Yes         |       | Yes   | Yes   | Yes      | Yes    |       | Yes    |
| Threads  | Yes         |       | Yes   | Yes   | Yes      | Yes    |       |        |
| YouTube  |             |       | Yes   | Yes   | Yes      | Yes    |       |        |

LinkedIn reports saves for personal profiles only and clicks for organization pages only. Engagement rate needs reach, so only Instagram and LinkedIn show it. The same Zernio Analytics add-on is required.

## Social sets

A social set holds one account on each platform, such as one brand's Instagram, LinkedIn and YouTube. Plans include 1 (Pro), 2 (Growth) or 10 (Business) sets ([billing](billing.md)). Every workspace starts with one, and the dashboard shows one set at a time: the sidebar switches between them, and the calendar, composer, analytics, Home, automations and inbox follow the chosen set. Settings → Social sets connects, renames and deletes them; a set can be deleted once it has no channels, and the last one stays.

Each set has its own Zernio profile, created with its first connection, since a profile holds one YouTube channel. `POST /api/accounts/connect` takes `socialSetId` (older dashboards send none and connect to the first set). The API refuses a second connected account on a platform in one set, and the database disconnects one that arrives through a webhook or sync, then lets Zernio go of it. A plan that covers fewer sets than the workspace has, after a downgrade, refuses new connections and pauses automations until sets are deleted or the plan is upgraded. Accounts stored before sets share the first set, even several on one platform; they keep working and reconnect as they are.

Contacts are listed per set (`socialSetId`, the first set when omitted). The inbox and automation stats read every set's profile. The home overview and the All tab (`GET /api/insights/overview?socialSetId=&days=`) cover one set: followers from Zernio's follower stats, whose change needs two daily counts, and the posts of the period and the one before, summed per platform. The numbers are as fresh as Zernio's last sync, shown as "Updated … ago"; reading posts has Zernio sync accounts it finds stale.

## Agents

REST and MCP list every account with its `platform`. Scheduled posts carry `accountId` and `platform`; `instagramAccountId` repeats `accountId` for older clients. `list_social_sets` lists the sets, and every account has `socialSetId`. Agents schedule on every platform with `cross_post` (`POST /api/v1/scheduled-posts/batch`), which takes the composer's body and runs the same checks, and can read, update and delete posts and read analytics on every platform. `schedule_post` publishes on a single Instagram account and refuses others with a validation error.

## Rollout

1. Apply `20261020090000_social_channels.sql`. It adds a `platform` column to accounts (default `instagram`), a platform and YouTube settings to scheduled posts, ties automations to Instagram accounts, and lets the account webhook store every supported platform.
2. Apply `20261026090000_social_sets.sql`. It gives every workspace a first set holding its Zernio profile and accounts, marks accounts that already shared a platform so they keep reconnecting, sells plans by set (1 / 2 / 10) and drops Ultimate, which was never sold. The previous API keeps working on both: accounts it stores join the first set.
3. Deploy the API, then the dashboard. The new API reads `social_sets`, so both migrations come first. Dashboards from before this change connect Instagram to the first set.
4. Run `pnpm billing:setup` in `live_mode` to update the Dodo products to the new prices and descriptions ([billing](billing.md)). Existing subscribers keep their price and get the plan's social sets.
5. Add a payment method to the Zernio team before connecting X.

The tests run every platform against a local Zernio fixture and PostgreSQL. They do not prove live publishing or metrics on each platform; check those with a real account on each.
