# Instagram article research and first publication batch

Research date: October 12, 2026. Audience: English-speaking creators and
businesses evaluating Instagram messaging automation. Markets sampled: US and
India. These are keyword-database estimates, not a live trending-query report.

## Demand evidence and prioritization

We requested 25 keywords per country from Serpstat's keyword overview through
treg. The US database returned 16 rows and India returned 5. Missing rows mean
unavailable data, not zero demand. Do not add singular/plural variants or related
queries together: their audiences can overlap. The provider's automatic language
labels are inconsistent, so country database selection, not those labels, defines
the market. No claim about rising demand is supported by this single snapshot.

| Priority | Article                                    | Demand evidence                                                                            | Search intent and article job                                                                                                  |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1        | `/blog/instagram-auto-reply`               | `instagram auto reply`: US 2,400/month                                                     | Setup intent: native acknowledgment versus comment-triggered resource delivery; practical steps and original message examples  |
| 2        | `/blog/aghost-vs-manychat`                 | No verified demand estimate for this direct comparison                                     | Direct buying comparison: Instagram campaigns, sales features, agent operation, billing models, and switching requirements     |
| 3        | `/blog/instagram-dm-limits`                | `instagram dm limits`: US 90/month; `instagram message limit`: US 110/month                | Rules intent: organic private replies, messaging windows, API throughput, tool allowances                                      |
| 4        | `/blog/best-instagram-dm-automation-tools` | Exact phrase unavailable; related `instagram dm automation`: US 320/month, India 720/month | Evaluation intent: shortlist six tools by job, then test a representative campaign                                             |
| 5        | `/blog/aghost-vs-chatfuel`                 | No verified demand estimate for this new comparison                                        | Direct buying comparison: aghost's Instagram campaigns and agent access versus Chatfuel's conversation and developer workflows |

Priority balances estimated demand, product fit, commercial intent, and coverage.
It is an editorial judgment, not a predicted ranking. The blog groups articles
by reader task, with the scheduling guide featured above the other posts.

October 18 update: at the user's request, remove the standalone ManyChat pricing
article and replace the five-alternatives article with `/blog/aghost-vs-manychat`.
Both old URLs permanently redirect to the direct comparison; the pricing URL
opens its billing-model section. The comparison covers actual product boundaries,
Growth product carousels, Business follow-up nudges, and external agent operation.
The older `manychat pricing` estimate (US 2,400/month) and `manychat alternative`
estimate (US 390/month) do not establish demand for this new direct comparison.
The catalog now contains six articles, with only their current URLs in the
sitemap, llms.txt, related reading, and blog collection data.

October 17 update: direct aghost-versus-competitor comparisons take priority over
competitor-versus-competitor articles. `/blog/aghost-vs-chatfuel` replaces the
original ManyChat-versus-Chatfuel article, with a permanent redirect from its old
URL. The original comparison query's volume is not evidence of demand for the
new topic. The how-to and messaging-rules guides continue to cover distinct tasks.
The new comparison acknowledges Chatfuel's SDK and publishing support; developer
access is not presented as exclusive to aghost.

Other returned terms included `instagram automation` (US 720, India 2,900) and
`instagram chatbot` (US 320, India 260). `instagram dm not working` was much larger
in India (22,200), but that broad query commonly concerns the Instagram app rather
than this product's automation. We did not target it with a misleading tool article.
The existing `/instagram-dm-automation` remains the general product guide; new
articles answer narrower questions and link back to it.

Cost: $0.0105 total ($0.008 US, $0.0025 India). Evidence is saved locally in
`.context/seo-keyword-evidence.json`. Research calls: US
`60533d8350344ec6ac63c380d7550b27`; India
`ef15ad727be54d0e838b5ed1784bb76f`.

## Competing articles examined

### Instagram scheduling addition: October 17, 2026

The user supplied an OpenSEO screenshot of US keyword research for Instagram
scheduling and requested a related article, with Postiz, Buffer, and Blotato as
references. The screenshot reports the following volumes; this is user-provided
evidence, not a new paid keyword lookup. Do not add related-query estimates
together or interpret the displayed score as a verified ranking difficulty.

| Query                                    | Reported US volume |
| ---------------------------------------- | -----------------: |
| can you schedule instagram posts         |              9,900 |
| schedule instagram posts                 |              6,600 |
| instagram scheduling tool                |              2,900 |
| can you schedule instagram stories       |              1,300 |
| how to find scheduled posts on instagram |              1,000 |

`/blog/how-to-schedule-instagram-posts` answers that setup and management intent
with native scheduling steps, the actual aghost calendar/composer workflow,
an agent example requiring approval before scheduling, tool-evaluation notes,
troubleshooting, and an original sample content plan. It is the blog's featured
article and has contextual links from the shared homepage/Features scheduling
section and related reading from the aghost comparison. Existing guides remain.
The catalog supplies its canonical metadata, BlogPosting data, sitemap entry,
and llms.txt listing. Publication and checked dates are October 17, 2026.

References checked:

- [Buffer's scheduling guide](https://buffer.com/resources/schedule-instagram-posts/)
  for its documented native Instagram scheduling and management steps. Menu
  wording and eligibility can vary; no numeric native scheduling horizon is
  promised.
- [Buffer's Instagram help guide](https://support.buffer.com/en-us/articles/using-instagram-with-buffer-YSjg2dXFV8)
  for automatic versus notification publishing and supported-format caveats.
- [Postiz's Instagram scheduler](https://postiz.com/channels/instagram)
  for its calendar, team-review, and MCP workflows. Its marketing claims about
  optimal times, reach, and Meta quotas are not reused.
- [Blotato's scheduling workflow](https://help.blotato.com/blog/build-social-media-scheduler-n8n-make)
  for timestamp/slot scheduling and n8n/Make integration, and its
  [Instagram agent guide](https://www.blotato.com/blog/how-to-post-to-instagram-with-claude)
  for MCP publishing. Agent access is not presented as exclusive to aghost.
- aghost claims were checked against `packages/api/src/contract/post.ts`,
  `packages/api/src/modules/posts/post.service.ts`,
  `apps/web/features/calendar/post-composer.tsx`, and the composer/calendar
  stores. The guide uses the shared `POST_LIMITS` contract for lead time and
  carousel size; browser-local time and post/Reel-only comment automation are
  explicit. No authenticated live publish or provider performance test is claimed.

### Earlier automation references

- [ManyChat's DM automation tool guide](https://manychat.com/blog/instagram-dm-automation-tools/)
  groups tools by marketing, sales, and support jobs. We used the search-intent
  pattern and source vendors directly for product facts.
- [ManyChat's alternatives guide](https://manychat.com/blog/top-10-alternatives-to-manychat/)
  demonstrates switching and free-option intent. Our article adds an explicit
  cutover checklist and explains when switching will not fix a Meta rule.
- [CreatorFlow's tool comparison](https://creatorflow.so/blog/best-instagram-dm-automation-tools/)
  emphasizes creator workflows and billing models. Our shortlist also distinguishes
  external agent operation from a customer-facing AI chatbot.
- [CreatorFlow's auto reply guide](https://creatorflow.so/blog/instagram-auto-reply/)
  covers native and third-party setup. Our article provides original examples and
  a concrete aghost workflow without claiming every account exposes the same menu.

All article copy and examples are original. Competitor case-study numbers,
screenshots, claims of tests, and conversion promises were not reused.

## Fact-checking sources and important distinctions

- [Meta private replies](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/private-replies/):
  the initial organic private reply and its follow-up conditions.
- [Meta Send Messages](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/):
  most user actions open a 24-hour window; a specified first message after a
  Click-to-Direct ad may open a window up to seven days.
- [Meta platform overview](https://developers.facebook.com/docs/instagram-platform/overview/):
  post/reel private-reply throughput, Send API throughput, and human support use.
  These developer pages returned HTTP 200 when fetched directly. Web browsing
  returned 429/access errors for some of them, so we checked their public document
  content via HTTP rather than relying on competitor summaries.
- [Meta's desktop inbox automation guide](https://www.facebook.com/business/help/318238182723007):
  directly fetched with `?locale=en_US` after the browsing tool reached a login
  page. It lists Auto reply, Away message, and Comment to message, among other
  templates. Articles acknowledge the native comment-triggered option. Channel
  availability is conditional on the reader's account, and we did not test a
  signed-in native setup flow.
- [ManyChat pricing](https://manychat.com/pricing), its
  [subscription guide](https://help.manychat.com/hc/en-us/articles/25800347122716-Manychat-subscription-How-to-choose-the-right-one-for-you),
  [Essential](https://help.manychat.com/hc/en-us/articles/25800276116508-Essential-plan),
  [Pro](https://help.manychat.com/hc/en-us/articles/25800228332572-Pro-plan),
  [Business](https://help.manychat.com/hc/en-us/articles/25800254159900-Business-plan),
  [Advanced](https://help.manychat.com/hc/en-us/articles/25800308984988-Advanced-plan), and
  [active contacts](https://help.manychat.com/hc/en-us/articles/25800323349020-Active-Contacts):
  use the model introduced March 2, 2026, with region/account rollout caveats.
  The October 18 direct comparison keeps the distinction between flat pricing
  and active-contact billing and links current official pricing; it does not
  reproduce the removed pricing article's detailed plan calculations. ManyChat's
  Instagram product, comment-trigger instructions, quick automation guide, and
  API token guide were also rechecked for workflow and developer-access claims.
- [LinkDM](https://www.linkdm.com/),
  [Chatfuel Instagram](https://chatfuel.com/instagram),
  [Chatfuel pricing](https://chatfuel.com/pricing),
  [Chatfuel usage limits](https://limits.chatfuel.com/), and
  [respond.io Instagram](https://respond.io/integrations/instagram):
  vendor sources for each comparison. Current Chatfuel pricing differs from older
  comparison posts; its AI usage rules are distinct from active-contact allowances.
- aghost facts were checked against `packages/api/src/contract/{automation,billing}.ts`,
  the existing public features and agent pages, and billing plan cards. Its prices
  in article bodies derive from the shared plan contract. No story triggers,
  autonomous FAQ bot, visual funnel builder, or multichannel messaging are claimed.

## Publication and maintenance

The six routes render at build time. Each has a canonical URL, unique metadata,
article Open Graph fields, a BlogPosting and breadcrumb graph, visible editorial
attribution, checked dates, source links, a table of contents, related reading,
and relevant product links. Sitemap and llms.txt list the routes, and the main
navigation, footer, and existing product guide link into the library.

Competitor-comparison pages disclose that aghost publishes them and that they are
documentation-based assessments, not hands-on performance tests. Visible FAQs
are provided for readers; no FAQ rich-result eligibility is promised. Publication
does not imply indexing or rankings. The code is ready for the site's normal
review and deployment workflow.

Recheck competitor pricing and Meta rules monthly, and before any promoted launch.
Only advance `updatedAt` when the article has actually been reviewed or changed;
sitemap timestamps come from that fixed date, not the build time.
The catalog derives its slug type from its entries: type checking rejects a
missing article body or a related link to an unknown slug before publication.
After deployment, track impressions, clicks, and actual sign-ups by article in
Search Console and existing analytics. No connected Search Console data was used
in this research pass.

## Next articles to validate

- Comment-to-DM troubleshooting focused on automation, distinct from general
  Instagram app failures.
- aghost vs LinkDM, once keyword data and Search Console impressions help
  prioritize it alongside the existing direct comparisons.
- A free-plan comparison with allowances rechecked on the publication date.
- Lead-magnet campaign examples for coaches, affiliates, and product launches.

Do not publish several lightly renamed articles targeting the same general
automation query. Add an article when it answers a distinct question and has a
clear internal-link relationship to the existing guide and first batch.
