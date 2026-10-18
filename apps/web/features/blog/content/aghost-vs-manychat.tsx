import Link from "next/link"
import { PLANS } from "@workspace/api/contract"
import { ComparisonTable, Source, sources, aghostPrice } from "./shared"
import type { ArticleContent } from "./types"

export const aghostVsManychat: ArticleContent = {
  answer:
    "Choose aghost for Instagram scheduling and comment-to-DM campaigns with flat contact pricing, product cards, eligible follow-ups, and optional operation through your AI agent. Consider ManyChat when you need a visual flow builder, broader messaging channels, or customer-facing AI conversations. Both can deliver links from Instagram comments; compare the complete campaign, required plan, and billing model before switching.",
  intro: (
    <>
      <p>
        A creator sending a workbook, a shop sharing a collection, and a team
        qualifying leads need different workflows. Start with what should happen
        after someone comments, rather than choosing the tool with the longest
        feature list.
      </p>
      <p>
        This comparison explains where aghost and ManyChat fit, how their costs
        scale, and what to check before moving an Instagram campaign. The
        examples illustrate possible setups; they are not measured sales or
        delivery results.
      </p>
    </>
  ),
  sections: [
    {
      id: "comparison-at-a-glance",
      title: "aghost vs ManyChat at a glance",
      body: (
        <>
          <ComparisonTable
            caption="Instagram workflows checked October 18, 2026"
            headings={["Decision", "aghost", "ManyChat"]}
            rows={[
              [
                "Core workflow",
                "Instagram publishing calendar and comment-to-DM campaigns",
                "Messaging automations, visual flows, and lead capture",
              ],
              [
                "Comments to DMs",
                "Post and reel triggers, keywords, public replies, opening messages, and link buttons",
                "Comment triggers, public replies, opening messages, and automated link delivery",
              ],
              [
                "Sales follow-ups",
                "Growth adds product carousels; Business adds eligible follow-up nudges",
                "Flows can collect details and send follow-up offers; check the selected plan",
              ],
              [
                "AI workflow",
                "Your external agent manages the workspace through MCP or REST",
                "AI features help build automations and handle customer conversations",
              ],
              [
                "Channels",
                "Instagram Business or Creator accounts",
                "Instagram and other supported messaging channels, depending on plan",
              ],
              [
                "Billing model",
                <>
                  Paid plans from {aghostPrice()}/month; no contact-based
                  increases
                </>,
                "Free and paid plans; paid plans have active-contact allowances and possible overages",
              ],
            ]}
          />
          <p>
            Compare aghost’s <Link href="/features">features</Link> and{" "}
            <Link href="/pricing">plans</Link> with ManyChat’s{" "}
            <Source href={sources.manychatInstagram}>Instagram product</Source>,{" "}
            <Source href={sources.manychatComments}>
              comment-trigger guide
            </Source>
            , and <Source href={sources.manychatPlans}>plan overview</Source>.
            Feature availability and account eligibility matter as much as the
            headline subscription price.
          </p>
        </>
      ),
    },
    {
      id: "choose-aghost",
      title: "Choose aghost for scheduled content and requested offers",
      body: (
        <>
          <p>
            aghost combines Instagram scheduling with the automation that
            answers a post’s comments. Prepare posts, reels, carousels, and
            stories in the calendar, and attach a comment-to-DM campaign to a
            post or reel before it publishes. Send a guide, product link,
            discount code, or booking page when the comment matches your rule.
          </p>
          <p>
            Pro covers link-delivery campaigns. Growth adds swipeable product
            cards with images, descriptions, and product links. Business adds a
            follow-up nudge for eligible conversations, with reminders stopping
            after a reply or link click. These features help present and revisit
            an offer; they do not establish that someone bought it.
          </p>
          <p>
            Use the dashboard directly or connect Claude Code, Codex, Cursor, or
            another agent through <Link href="/agents">MCP or REST</Link>. Your
            agent can prepare campaigns, schedule content, inspect activity, and
            help answer your inbox. Every plan includes that access. aghost does
            not provide a visual flow builder or an autonomous FAQ chatbot for
            every incoming DM.
          </p>
        </>
      ),
    },
    {
      id: "choose-manychat",
      title: "Consider ManyChat for branching flows and broader messaging",
      body: (
        <>
          <p>
            <Source href={sources.manychatInstagram}>ManyChat</Source> offers
            guided automations, a visual flow builder, and AI features for
            customer conversations. Its supported channels extend beyond
            Instagram. Evaluate it when your campaign needs to gather answers,
            branch into different paths, or connect with an existing marketing
            workflow.
          </p>
          <p>
            Its{" "}
            <Source href={sources.manychatQuickAutomation}>
              comment-to-DM setup guide
            </Source>{" "}
            covers opening messages, follower requests, email collection, link
            delivery, and follow-up reminders. Confirm the features your chosen
            plan includes instead of assuming every workflow is available at the
            entry price.
          </p>
          <p>
            Developer access is not exclusive to aghost. ManyChat publishes an{" "}
            <Source href={sources.manychatApi}>API token guide</Source>. Check
            the available endpoints, channels, and plan requirements against the
            tasks you need. aghost’s included MCP connection is a way for your
            own agent to operate the workspace; that is a different job from a
            customer-facing AI assistant.
          </p>
        </>
      ),
    },
    {
      id: "pricing",
      title: "Compare flat plans with active-contact billing",
      body: (
        <>
          <p>
            aghost’s plan depends on the Instagram accounts and features you
            need. More contacts and DMs do not increase the subscription price.
            Instagram’s publishing and messaging limits and fair use still
            apply.
          </p>
          <ComparisonTable
            caption="aghost monthly USD plans; applicable tax included"
            headings={["Plan", "Monthly price", "Accounts and features"]}
            rows={[
              [
                "Pro",
                aghostPrice(),
                `${PLANS.pro.instagramAccounts} Instagram account; scheduling, comment-to-DM, inbox, MCP, and REST`,
              ],
              [
                "Growth",
                aghostPrice("growth"),
                `${PLANS.growth.instagramAccounts} Instagram accounts; Pro features plus product carousels`,
              ],
              [
                "Business",
                aghostPrice("business"),
                `${PLANS.business.instagramAccounts} Instagram accounts; Growth features plus follow-up nudges`,
              ],
            ]}
          />
          <p>
            ManyChat has a free option and paid plans. Its current{" "}
            <Source href={sources.manychatContacts}>
              active-contact model
            </Source>{" "}
            counts people you interact with during a monthly billing period;
            paid allowances and overages depend on the plan. Check its{" "}
            <Source href={sources.manychatPricing}>live pricing</Source> and{" "}
            <Source href={sources.manychatPlans}>subscription guide</Source> for
            your region and account. Monthly and annual billing are different
            commitments, and existing accounts may have different plan options.
          </p>
          <p>
            Compare the same campaign on both products: required features,
            connected accounts, expected active contacts, billing term, and any
            extra usage. A flat price can simplify a busy campaign’s budget,
            while a free allowance or a feature you rely on may make another
            plan the better fit. Confirm the total before switching.
          </p>
        </>
      ),
    },
    {
      id: "sales-workflow",
      title: "Test one Instagram sales workflow from comment to offer",
      body: (
        <>
          <p>
            Suppose a shop publishes a reel inviting people to comment SHOP for
            its new collection. In aghost, prepare the post and a paused
            automation, select the keyword, and review the message before
            turning it on. On Growth or Business, the requested offer can use
            product cards; on Pro, use a clear link button.
          </p>
          <ol>
            <li>
              Make the post explain what the commenter will receive. Test a
              matching comment and one that should not match.
            </li>
            <li>
              If you use an opening button or follower rule, test that step
              before the offer. Confirm the correct product or booking page
              opens from the DM.
            </li>
            <li>
              If you enable a Business follow-up, check conversation eligibility
              and verify that a reply or link click stops the reminder.
            </li>
            <li>
              Inspect delivery activity and clicks, then measure purchases or
              bookings in the destination system. A delivered DM is not a sale.
            </li>
          </ol>
          <p>
            Run the same offer through your proposed ManyChat flow and check any
            extra qualification or handoff steps. Both products must respect
            Meta’s messaging rules; changing tools does not create permission
            for unlimited promotional follow-ups. Read the{" "}
            <Link href="/blog/instagram-dm-limits">
              Instagram DM rules guide
            </Link>{" "}
            alongside the{" "}
            <Source href={sources.metaPrivateReplies}>
              official private-reply documentation
            </Source>
            .
          </p>
        </>
      ),
    },
    {
      id: "switching-checklist",
      title: "Before switching from ManyChat to aghost",
      body: (
        <>
          <p>
            Inventory your active posts, keywords, messages, buttons,
            conditions, and destination links. Mark any branching flow, channel,
            integration, or customer-facing AI behavior you cannot remove.
            Confirm those requirements before canceling the old subscription.
          </p>
          <p>
            Do not assume flows or conversation history transfer between tools.
            Rebuild one representative campaign, test it from a separate
            Instagram account, and plan the cutover so two active automations do
            not respond to the same comment. Our{" "}
            <Link href="/blog/instagram-auto-reply">
              auto-reply setup guide
            </Link>{" "}
            walks through an aghost comment campaign; the{" "}
            <Link href="/blog/how-to-schedule-instagram-posts">
              scheduling guide
            </Link>{" "}
            covers preparing content before publication.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "Is aghost a ManyChat alternative for Instagram?",
      answer:
        "Yes, for Instagram scheduling, comment-to-DM campaigns, product offers, eligible follow-up nudges, and operation through your own AI agent. Evaluate ManyChat if you depend on a visual flow builder, broader messaging channels, or customer-facing AI conversations.",
    },
    {
      question: "Does aghost charge more as my contact list grows?",
      answer: (
        <>
          No. Its subscription depends on the plan’s Instagram account count and
          features, with Pro starting at {aghostPrice()}/month. Contacts and DMs
          do not increase that price. Instagram’s messaging limits and fair use
          still apply; see the <Link href="/pricing">current plans</Link>.
        </>
      ),
    },
    {
      question:
        "Does connecting an AI agent make aghost an automatic sales chatbot?",
      answer:
        "No. The connection lets your agent operate scheduling, automations, activity, and inbox tools. You review the campaign and decide what it sends. It is not a built-in autonomous chatbot answering every incoming customer question.",
    },
    {
      question: "Can I move my ManyChat flows directly into aghost?",
      answer:
        "Do not assume an automatic import. Compare each trigger, message, condition, channel, and integration, then rebuild and test a representative campaign. Confirm data-export and history requirements separately before cutting over.",
    },
  ],
}
