import Link from "next/link"
import { ComparisonTable, Source, sources, aghostPrice } from "./shared"
import type { ArticleContent } from "./types"

export const aghostVsChatfuel: ArticleContent = {
  answer:
    "Choose aghost when you want a ready-to-use Instagram workspace for scheduling content, delivering links from comments, and operating campaigns through Claude Code, Codex, or Cursor. Consider Chatfuel when customer-facing AI conversations, qualification, and broader messaging workflows are central to the job. Compare the campaign you need and the billing commitment before choosing.",
  intro: (
    <>
      <p>
        Start with the interaction you want to deliver. A creator who promises
        “comment GUIDE and I’ll send the download” needs a predictable message
        and link. A business answering varied product or booking questions may
        need a conversational assistant and a clear handoff to its team.
      </p>
      <p>
        This guide compares aghost’s current product with Chatfuel’s published
        offerings. It explains where each fits, what the prices commit you to,
        and how to test your own Instagram campaign.
      </p>
    </>
  ),
  sections: [
    {
      id: "comparison-at-a-glance",
      title: "aghost vs Chatfuel at a glance",
      body: (
        <>
          <ComparisonTable
            caption="Instagram workflows and starting prices checked October 17, 2026"
            headings={["Decision", "aghost", "Chatfuel"]}
            rows={[
              [
                "Main workflow",
                "Schedule Instagram content and deliver links from comments",
                "Automate customer conversations, qualification, and handoff",
              ],
              [
                "Comment-to-DM",
                "Keyword or any-comment triggers, opening messages, and link buttons",
                "Published Instagram comment-reply and DM automation tools",
              ],
              [
                "What the AI agent does",
                "Your connected agent operates your workspace through MCP or REST",
                "A customer-facing AI assistant can answer from business information",
              ],
              [
                "Developer workflow",
                "Hosted workspace with MCP setup for Claude Code, Codex, and Cursor",
                "API, integrations, and a separate SDK/CLI for building your own app",
              ],
              [
                "Starting price",
                <>Pro {aghostPrice()}/month, billed monthly</>,
                "Business $18/month equivalent, billed $216/year",
              ],
              [
                "What to budget",
                "Instagram account count and the plan features your campaign needs",
                "Billing term, AI allowance, and any additional usage",
              ],
            ]}
          />
          <p>
            Read aghost’s <Link href="/features">features</Link>,{" "}
            <Link href="/pricing">plans</Link>, and{" "}
            <Link href="/agents">Instagram MCP setup</Link> alongside Chatfuel’s{" "}
            <Source href={sources.chatfuelInstagram}>Instagram offering</Source>
            , <Source href={sources.chatfuelPricing}>pricing</Source>, and{" "}
            <Source href={sources.chatfuelSdk}>SDK overview</Source>. These are
            workflow summaries, rather than measured claims about delivery speed
            or conversion rates.
          </p>
        </>
      ),
    },
    {
      id: "choose-aghost",
      title: "Choose aghost for a scheduled post and a clear DM promise",
      body: (
        <>
          <p>
            aghost combines a publishing calendar with comment-to-DM automation.
            Schedule posts, reels, carousels, and stories, and attach an
            automation to a post or reel before it publishes. The campaign can
            deliver a guide, booking link, product page, or other resource when
            a comment matches your rule.
          </p>
          <p>
            Configure it in the dashboard or ask your agent to prepare it.
            Review the selected post, keyword, message, link buttons, and
            publishing time before activating the campaign. An inbox and
            activity records help you continue the conversation and see which
            messages were sent, failed, or are waiting for a tap.
          </p>
          <p>
            Every plan includes MCP and REST access. Growth adds product cards
            in DMs; Business adds follow-up nudges. Check those plan boundaries
            when choosing your workflow. aghost’s agent access helps you operate
            the product; it does not turn every incoming DM into an autonomous
            FAQ conversation.
          </p>
        </>
      ),
    },
    {
      id: "choose-chatfuel",
      title: "Consider Chatfuel when the conversation needs an AI assistant",
      body: (
        <>
          <p>
            Chatfuel publishes tools for AI conversations, lead qualification, a
            shared inbox, and integrations. Include it in your evaluation when
            people ask varied questions before choosing a product or booking,
            and test how the conversation reaches a person when needed.
          </p>
          <p>
            Developer access is worth comparing, too. Chatfuel’s{" "}
            <Source href={sources.chatfuelSdkInstagram}>
              Instagram SDK guide
            </Source>{" "}
            describes building an app around its API, with comment and DM rules,
            an AI knowledge base, publishing, and an inbox. Compare that
            app-building route with operating an existing aghost workspace; both
            have developer workflows, with different setup and maintenance
            decisions.
          </p>
        </>
      ),
    },
    {
      id: "pricing-and-usage",
      title: "Compare the billing term and the usage you expect",
      body: (
        <>
          <p>
            aghost Pro is {aghostPrice()}/month, billed monthly, for one
            Instagram account, including applicable tax. Its subscription does
            not increase with your contact list. Use the{" "}
            <Link href="/pricing">pricing page</Link> to compare account
            allowances and features across the plans.
          </p>
          <p>
            Chatfuel’s public Business price showed $18/month equivalent, billed
            at $216 for a year, when checked on October 17, 2026. Its{" "}
            <Source href={sources.chatfuelPricing}>pricing page</Source>{" "}
            advertises a free trial and an AI allowance. Confirm the monthly
            billing option and current trial limits before committing.
          </p>
          <p>
            Annual and monthly subscriptions are different commitments. Prices
            shown here are in USD. Confirm Chatfuel’s taxes and any extra usage
            charges at checkout. Forecast an ordinary month and a busy launch
            using the same campaign, account count, and required features. For
            Chatfuel, review the{" "}
            <Source href={sources.chatfuelLimits}>usage rules</Source> against
            the conversations you expect.
          </p>
        </>
      ),
    },
    {
      id: "test-your-workflow",
      title: "Test the campaign your audience will actually use",
      body: (
        <>
          <ol>
            <li>
              Write the promise first: deliver a particular link, answer a
              question, collect a detail, or help someone book.
            </li>
            <li>
              Confirm your Instagram account is eligible and that the chosen
              plan includes the trigger and features you need.
            </li>
            <li>
              Prepare one post with your own media and destination URL. Review
              the message and any publishing time before making it active.
            </li>
            <li>
              Try a matching comment, a nonmatching comment, and a follow-up
              question. Check delivery, links, and the path to a human reply.
            </li>
            <li>
              Compare activity and actual usage with your budget. Run separate
              trials so two tools do not respond to the same trigger.
            </li>
          </ol>
          <p>
            Both workflows depend on Instagram’s permissions and messaging
            rules. Our{" "}
            <Link href="/blog/instagram-dm-limits">DM limits guide</Link>{" "}
            explains the windows to account for. The{" "}
            <Link href="/blog/instagram-auto-reply">auto reply guide</Link>{" "}
            helps you decide which parts can use native replies.
          </p>
        </>
      ),
    },
    {
      id: "start-with-aghost",
      title: "Start with one Instagram campaign in aghost",
      body: (
        <>
          <p>
            Choose a plan, connect your Instagram professional account, and
            prepare one comment-to-DM automation. If you already work with
            Claude Code, Codex, or Cursor, follow the{" "}
            <Link href="/agents">agent setup guide</Link> and ask it to prepare
            a paused campaign for review. You can also manage it directly in the
            dashboard.
          </p>
          <p>
            Comparing more options? The{" "}
            <Link href="/blog/manychat-alternatives">
              ManyChat alternatives guide
            </Link>{" "}
            covers five tools, their costs, and the workflow each is suited to.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "Is aghost an alternative to Chatfuel?",
      answer:
        "Yes, for Instagram scheduling, comment-to-DM link delivery, and campaigns operated through a connected AI agent. If your core need is a customer-facing AI assistant or a broader messaging workflow, evaluate Chatfuel against that specific job.",
    },
    {
      question: "Does aghost include an AI chatbot for customer questions?",
      answer:
        "aghost connects your own agent to workspace operations such as scheduling, automation setup, stats, and inbox replies. It does not currently provide an autonomous FAQ chatbot that answers every incoming customer question.",
    },
    {
      question: "Is aghost cheaper than Chatfuel?",
      answer: (
        <>
          aghost Pro is {aghostPrice()}/month billed monthly. Chatfuel’s public
          Business price was $18/month equivalent billed at $216/year when
          checked October 17, 2026. Compare billing terms, required features,
          account allowances, and AI usage before estimating your own total.
        </>
      ),
    },
    {
      question: "Will my Chatfuel flows transfer to aghost?",
      answer:
        "Do not assume an automatic transfer. Inventory the triggers, messages, links, and conditions your campaign needs, then rebuild and test one workflow before switching tools.",
    },
  ],
}
