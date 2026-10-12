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

| Priority | Article                                    | Demand evidence                                                                            | Search intent and article job                                                                                                 |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1        | `/blog/instagram-auto-reply`               | `instagram auto reply`: US 2,400/month                                                     | Setup intent: native acknowledgment versus comment-triggered resource delivery; practical steps and original message examples |
| 2        | `/blog/manychat-pricing`                   | `manychat pricing`: US 2,400/month                                                         | Buying intent: current plans, billing cycles, active contacts, worked cost examples                                           |
| 3        | `/blog/manychat-alternatives`              | `manychat alternative`: US 390/month                                                       | Switching intent: five replacement candidates, constraints, and migration checklist                                           |
| 4        | `/blog/instagram-dm-limits`                | `instagram dm limits`: US 90/month; `instagram message limit`: US 110/month                | Rules intent: organic private replies, messaging windows, API throughput, tool allowances                                     |
| 5        | `/blog/best-instagram-dm-automation-tools` | Exact phrase unavailable; related `instagram dm automation`: US 320/month, India 720/month | Evaluation intent: shortlist six tools by job, then test a representative campaign                                            |
| 6        | `/blog/manychat-vs-chatfuel`               | Exact comparison: US 90/month                                                              | Direct comparison intent: marketing workflow versus conversational workflow; different billing units                          |

Priority balances estimated demand, product fit, commercial intent, and coverage.
It is an editorial judgment, not a predicted ranking. The highest relevant setup
and pricing terms appear first in the catalog; the blog groups them by reader task.

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
  Annual prices are labeled as monthly equivalents paid upfront. Worked examples
  are calculations, not live checkout quotes. The Essential help page rounds its
  annual overage differently from the pricing page; examples use verified monthly
  rates to avoid that discrepancy.
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
After deployment, track impressions, clicks, and actual sign-ups by article in
Search Console and existing analytics. No connected Search Console data was used
in this research pass.

## Next articles to validate

- Comment-to-DM troubleshooting focused on automation, distinct from general
  Instagram app failures.
- ManyChat vs LinkDM and ManyChat vs aghost, once keyword data and first-batch
  Search Console impressions help prioritize them.
- A free-plan comparison with allowances rechecked on the publication date.
- Lead-magnet campaign examples for coaches, affiliates, and product launches.

Do not publish several lightly renamed articles targeting the same general
automation query. Add an article when it answers a distinct question and has a
clear internal-link relationship to the existing guide and first batch.
