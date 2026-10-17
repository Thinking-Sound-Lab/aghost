import Link from "next/link"
import { ComparisonTable, Source, sources, aghostPrice } from "./shared"
import type { ArticleContent } from "./types"

export const manychatAlternatives: ArticleContent = {
  answer:
    "The right ManyChat alternative depends on what you want to replace. Consider aghost for Instagram comment-to-DM with flat pricing and AI-agent access, LinkDM for link-delivery campaigns, Chatfuel for conversational automation, respond.io for team messaging, and Meta Business Suite for basic native replies.",
  intro: (
    <>
      <p>
        Before switching, name the problem you want to solve. It might be a
        growing bill, a flow you no longer want to maintain, or an inbox that
        needs better team ownership. Changing software helps only if the new
        tool covers the steps your audience already depends on.
      </p>
      <p>
        This comparison is organized around replacement jobs. It also includes a
        migration checklist, because a tool that looks suitable on a pricing
        page can still require you to rebuild an important campaign.
      </p>
    </>
  ),
  sections: [
    {
      id: "alternatives-at-a-glance",
      title: "Compare prices, free allowances, and replacement jobs",
      body: (
        <>
          <ComparisonTable
            caption="ManyChat alternatives: USD prices and allowances checked October 17, 2026"
            headings={[
              "Alternative",
              "Price and billing",
              "Free plan or trial",
              "Workflow and limits",
            ]}
            rows={[
              [
                <Link key="aghost" href="/pricing">
                  aghost
                </Link>,
                <>Pro {aghostPrice()}/month, billed monthly</>,
                "No free tier listed",
                "Comment-to-DM, scheduling, and agent access. Pro includes one Instagram account; broader channels and a visual flow builder are not included.",
              ],
              [
                <Source key="linkdm" href={sources.linkdmPricing}>
                  LinkDM
                </Source>,
                "Free; Pro $19/month, billed monthly",
                "1,000 DMs/month on Free; one Instagram account",
                "Creator link campaigns. Pro lists up to 25,000 DMs/month and three accounts; check which triggers require a paid plan.",
              ],
              [
                <Source key="chatfuel" href={sources.chatfuelPricing}>
                  Chatfuel
                </Source>,
                "Business from $18/month equivalent, billed $216/year",
                "Free trial advertised; check its current allowance",
                "AI conversations and human handoff. Check AI credits, processing limits, and required Instagram integrations.",
              ],
              [
                <Source key="respond" href={sources.respondPricing}>
                  respond.io
                </Source>,
                "Starter $99/month; $79/month equivalent billed $948/year",
                "7-day trial: five users and 1,000 monthly active contacts; broadcasts excluded",
                "Team inbox. Starter includes five users; workflow automation requires Growth. Check contacts, AI credits, and extra-seat charges.",
              ],
              [
                <Source key="meta" href={sources.metaBusinessSuite}>
                  Meta Business Suite
                </Source>,
                "Free native tools; advertising costs are separate",
                "Basic inbox tools; availability depends on your account",
                "Native replies. Confirm the Instagram triggers your account offers before relying on it for a comment-to-DM campaign.",
              ],
            ]}
          />
          <p>
            Linked tool names open official product or pricing pages. These are
            starting prices, before applicable taxes and extra usage. Annual
            rates are monthly equivalents paid for the full year; they are not
            month-to-month subscriptions. respond.io’s{" "}
            <Source href={sources.respondPricingGuide}>plan guide</Source> lists
            its monthly rates. A free trial is different from an ongoing free
            plan, and the cheapest plan may not include the automation you need.
          </p>
          <p>
            A replacement need not reproduce every feature in your old tool. It
            does need to preserve the promise you make in your content: the
            correct response, the correct resource, and a way to handle the
            person’s next question.
          </p>
        </>
      ),
    },
    {
      id: "aghost",
      title: "aghost: comment-to-DM with flat pricing and agent access",
      body: (
        <>
          <p>
            aghost sends DMs from Instagram post and reel comments, using
            keywords or an any-comment rule. It includes optional public
            replies, opening messages, follower conditions, an inbox, and
            campaign activity. Its <Link href="/pricing">Pro plan</Link> is{" "}
            {aghostPrice()}/month for one account, without contact-based
            subscription increases.
          </p>
          <p>
            Choose it when your recurring job is “deliver this requested link
            from this post,” especially if you want{" "}
            <Link href="/agents">Claude Code, Codex, or Cursor</Link> to operate
            the campaign through MCP or REST. It does not provide a multichannel
            visual funnel builder or an autonomous FAQ chatbot. Those are
            material differences if you currently rely on them.
          </p>
        </>
      ),
    },
    {
      id: "linkdm",
      title: "LinkDM: a candidate for creator link campaigns",
      body: (
        <>
          <p>
            <Source href={sources.linkdmPricing}>LinkDM</Source> focuses on
            sending links from Instagram engagement. Its public site lists a
            free allowance of 1,000 DMs per month and Pro at $19/month. It also
            lists up to 25,000 DMs per month and three Instagram accounts on
            Pro. Check the current plan comparison for overflow and queue
            features before assuming they are included.
          </p>
          <p>
            Evaluate it with your busiest campaign, not only a single successful
            test comment. Ask which features your plan includes and what happens
            when demand arrives faster than the queue sends. The outcome you
            want is reliable delivery while the interaction is eligible.
          </p>
        </>
      ),
    },
    {
      id: "chatfuel",
      title: "Chatfuel: a candidate for conversations beyond one link",
      body: (
        <>
          <p>
            <Source href={sources.chatfuelInstagram}>
              Chatfuel’s Instagram product
            </Source>{" "}
            describes keyword replies, a flow builder, lead management, and live
            chat. Consider it when the conversation needs to gather details or
            answer questions before a person chooses the next step.
          </p>
          <p>
            Test the questions your audience really asks, including one the bot
            should hand to a person. Also inspect the{" "}
            <Source href={sources.chatfuelLimits}>AI usage rules</Source>:
            contact allowances and AI processing are different budget items. A
            useful migration test checks both the answer and the way your team
            takes over an unresolved conversation.
          </p>
        </>
      ),
    },
    {
      id: "respond-io",
      title: "respond.io: a candidate for a team-owned inbox",
      body: (
        <>
          <p>
            <Source href={sources.respondInstagram}>
              respond.io’s Instagram integration
            </Source>{" "}
            covers a shared inbox, automation, AI agents, and CRM connections.
            It is a relevant candidate when sales or support ownership across
            people and channels is the main problem you want to solve.
          </p>
          <p>
            Have the people who answer customers test the handoff. Can they see
            enough context, recognize who owns the conversation, and continue
            from the right place? A creator delivering one download may need
            less operational structure than a team distributing conversations
            among several people.
          </p>
        </>
      ),
    },
    {
      id: "meta-business-suite",
      title: "Meta Business Suite: start with the native inbox",
      body: (
        <>
          <p>
            Check{" "}
            <Source href={sources.metaInboxAutomations}>
              Meta Business Suite’s automation guide
            </Source>{" "}
            when the job is acknowledging an incoming message or communicating
            working hours. Inspect the channel and automation options in your
            own business account before assuming a feature is available.
          </p>
          <p>
            A simple native reply can be enough for a business that receives a
            few direct inquiries. Meta also lists Comment to message for post
            keyword replies. For a recurring resource campaign, check whether it
            supports your Instagram account and evaluate the delivery flow. Our{" "}
            <Link href="/blog/instagram-auto-reply">auto reply guide</Link>{" "}
            walks through that distinction.
          </p>
        </>
      ),
    },
    {
      id: "before-switching",
      title: "Check whether switching solves your actual problem",
      body: (
        <>
          <p>
            If cost is the reason for moving, first calculate your current plan
            correctly. A different tier or usage control may solve the problem
            with less rebuilding. See our{" "}
            <Link href="/blog/manychat-pricing">ManyChat pricing examples</Link>{" "}
            for the current contact-based model.
          </p>
          <p>
            If a DM failed, identify the failure before moving platforms. An
            expired conversation window will remain expired in another tool. The{" "}
            <Link href="/blog/instagram-dm-limits">messaging rules guide</Link>{" "}
            helps distinguish a platform rule from a missing feature or a
            delivery problem.
          </p>
          <p>
            Finally, compare maintenance effort. A tool that saves a small
            amount each month may be a poor trade if you must rebuild a complex
            funnel, retrain a team, and manually transfer essential context. A
            simpler campaign may make that same switch straightforward.
          </p>
        </>
      ),
    },
    {
      id: "migration-checklist",
      title: "A migration checklist for Instagram campaigns",
      body: (
        <>
          <ol>
            <li>
              Inventory active triggers, posts, keywords, messages, buttons,
              follower conditions, and destination URLs.
            </li>
            <li>
              Mark which features are essential. Confirm them in the new tool
              before canceling the old subscription.
            </li>
            <li>
              Rebuild one campaign on a test post. Check a matching comment, a
              nonmatching comment, and any opening-button or follower branch.
            </li>
            <li>
              Confirm the contact and conversation data you can export. Do not
              assume flow logic or historical conversations transfer
              automatically.
            </li>
            <li>
              Plan a controlled cutover. Avoid two tools responding to the same
              trigger at the same time.
            </li>
            <li>
              Review real campaign activity after the switch, and update any
              instructions your team or AI agent follows.
            </li>
          </ol>
          <p>
            Pick the replacement that completes the smallest essential workflow
            first. Expand only after you can see the right message and resource
            arriving from a fresh interaction.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "What is a free alternative to ManyChat?",
      answer:
        "Check Meta Business Suite's native reply options and LinkDM's published free allowance. Compare the trigger and usage you need, because a free inbox acknowledgment and a free comment-to-DM campaign solve different problems.",
    },
    {
      question: "Which ManyChat alternative supports AI coding agents?",
      answer: (
        <>
          aghost provides authenticated MCP and REST access for clients such as
          Claude Code, Codex, and Cursor. See the{" "}
          <Link href="/agents">agent setup page</Link> for the supported
          operations.
        </>
      ),
    },
    {
      question: "Will my ManyChat flows transfer to another tool?",
      answer:
        "Do not assume they will. Confirm the new provider's import options and rebuild a test campaign. Messages, branching logic, contacts, and conversation history can have different migration paths.",
    },
  ],
}
