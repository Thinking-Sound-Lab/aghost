import Link from "next/link"
import { ComparisonTable, Source, sources, aghostPrice } from "./shared"
import type { ArticleContent } from "./types"

export const manychatVsChatfuel: ArticleContent = {
  answer:
    "Shortlist ManyChat when your priority is structured marketing automation across messaging channels. Shortlist Chatfuel when you want to evaluate conversational AI and lead qualification. Both cover Instagram workflows; compare the exact trigger, handoff, and usage costs with a representative campaign before deciding.",
  intro: (
    <>
      <p>
        ManyChat and Chatfuel overlap enough that a feature checklist alone may
        leave you undecided. The more useful question is what happens after your
        audience’s first interaction: do they receive a known resource, answer a
        structured set of questions, or need an assistant to handle varied
        inquiries?
      </p>
      <p>
        This guide compares the products’ published offerings and suggests a
        practical trial. It also separates subscription allowances from AI
        usage, which is important when estimating the cost of a busy month.
      </p>
    </>
  ),
  sections: [
    {
      id: "comparison-at-a-glance",
      title: "ManyChat vs Chatfuel at a glance",
      body: (
        <>
          <ComparisonTable
            caption="Compare the workflow and the billing unit"
            headings={["Question", "ManyChat", "Chatfuel"]}
            rows={[
              [
                "Instagram automation",
                "Comments, DMs, lead-capture workflows",
                "Keyword replies, flows, lead management",
              ],
              [
                "AI conversations",
                "Included in selected paid plans",
                "Part of the current AI chatbot offering",
              ],
              [
                "Usage to forecast",
                "Active contacts and plan extras",
                "AI processing allowance and plan limits",
              ],
              [
                "Human handoff",
                "Check your plan's inbox seats and routing",
                "Test live chat and team takeover",
              ],
              [
                "Evaluation focus",
                "Campaign branching and channel coverage",
                "Answer quality and conversational workflow",
              ],
            ]}
          />
          <p>
            Feature summaries come from the{" "}
            <Source href={sources.manychatInstagram}>
              ManyChat Instagram page
            </Source>{" "}
            and{" "}
            <Source href={sources.chatfuelInstagram}>
              Chatfuel Instagram page
            </Source>
            . Neither column represents a measured performance advantage.
          </p>
        </>
      ),
    },
    {
      id: "manychat-fit",
      title: "When to put ManyChat on your shortlist",
      body: (
        <>
          <p>
            ManyChat is a relevant candidate when you want a structured
            campaign: deliver the requested resource, collect a detail, branch
            by the response, and pass the lead to the next step. Its published
            plans cover several messaging channels, with availability varying by
            tier.
          </p>
          <p>
            For your trial, sketch the campaign before opening the builder. List
            the entry trigger, the information you need, the conditions that
            determine each path, and the point at which a person takes over.
            Then test whether the resulting flow stays understandable when you
            return to it a week later.
          </p>
          <p>
            If your plan includes AI conversations, test them independently of
            your fixed campaign messages. A correct button flow does not tell
            you whether an assistant handles an unexpected question well.
          </p>
        </>
      ),
    },
    {
      id: "chatfuel-fit",
      title: "When to put Chatfuel on your shortlist",
      body: (
        <>
          <p>
            Chatfuel is a relevant candidate when your campaign includes varied
            questions, qualification, and a handoff to a person. Its Instagram
            offering describes flows, custom replies, and live chat; the current{" "}
            <Source href={sources.chatfuelPricing}>pricing page</Source>{" "}
            presents business and agency AI chatbot plans.
          </p>
          <p>
            Prepare approved answers for your most common questions, then add a
            deliberately incomplete request. For example, ask about a booking
            without giving the location or date. Evaluate whether the assistant
            asks for the missing detail, avoids inventing an answer, and hands
            off when it reaches the boundary you set.
          </p>
          <p>
            Include the person who will answer escalations in the trial. A
            useful assistant needs a clear continuation path when the customer
            wants help that the automation cannot provide.
          </p>
        </>
      ),
    },
    {
      id: "pricing-and-usage",
      title: "Compare pricing using the right workload",
      body: (
        <>
          <p>
            ManyChat’s new pricing uses active-contact allowances. Its monthly
            Essential and Pro subscriptions are $17 and $39, respectively. See
            the{" "}
            <Source href={sources.manychatPricing}>current pricing page</Source>{" "}
            and our{" "}
            <Link href="/blog/manychat-pricing">worked cost examples</Link> for
            billing-cycle and overage details.
          </p>
          <p>
            Chatfuel’s{" "}
            <Source href={sources.chatfuelPricing}>Business price</Source> was
            displayed as $18/month equivalent, billed yearly at $216, when
            checked on October 12, 2026. That annual commitment is not the same
            billing basis as a monthly ManyChat subscription. Check your chosen
            billing option before comparing totals.
          </p>
          <p>
            Chatfuel’s{" "}
            <Source href={sources.chatfuelLimits}>usage documentation</Source>{" "}
            separates unlimited contacts and static actions from an AI
            processing allowance. AI usage depends on the context processed, and
            the AI assistant pauses if the allowance is exceeded. Forecast the
            conversations you expect, including their depth and the information
            the assistant must consult.
          </p>
          <p>
            Compare an ordinary month and a launch month using the same
            assumptions. Include people who need inbox access, necessary
            integrations, other channels, and the cost of maintaining the
            workflow. A single starting price leaves out most of that decision.
          </p>
        </>
      ),
    },
    {
      id: "representative-trial",
      title: "Run a representative trial in both tools",
      body: (
        <>
          <ol>
            <li>
              Start from one post and one requested resource. Keep the audience
              promise identical in both trials.
            </li>
            <li>
              Use the matching keyword, a nonmatching comment, and a follow-up
              question that requires context.
            </li>
            <li>
              Test a human handoff. Confirm the person can see the conversation
              and continue without asking the customer to repeat everything.
            </li>
            <li>
              Review the activity records and the explanation for any waiting or
              failed message.
            </li>
            <li>
              Check the destination URL, then measure a completed customer
              action such as a booking or download.
            </li>
            <li>
              Estimate the bill from the applicable usage unit before expanding
              the campaign.
            </li>
          </ol>
          <p>
            Run the trials separately so two platforms do not compete to answer
            the same comment. Keep the record of what you tested: that is more
            useful than deciding from an impressive template demonstration.
          </p>
        </>
      ),
    },
    {
      id: "focused-alternative",
      title: "When a focused comment-to-DM tool is enough",
      body: (
        <>
          <p>
            If the whole workflow is “comment GUIDE and receive this link,”
            include a focused alternative in your trial. aghost supports that
            job with keyword matching, optional opening and public replies,
            follower conditions, and an inbox. Its Pro plan is {aghostPrice()}
            /month for one Instagram account.
          </p>
          <p>
            aghost also lets an{" "}
            <Link href="/agents">AI agent operate campaigns</Link> over MCP or
            REST. That is different from a chatbot autonomously answering every
            incoming customer question. Choose it for the campaign-operation
            workflow, and choose a broader conversational product when the
            conversation itself requires those capabilities.
          </p>
          <p>
            The{" "}
            <Link href="/blog/manychat-alternatives">alternatives guide</Link>{" "}
            covers more replacement options. Whichever tool you shortlist, check
            the <Link href="/blog/instagram-dm-limits">messaging rules</Link>{" "}
            and test the path your audience will actually follow.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "Is ManyChat cheaper than Chatfuel?",
      answer:
        "It depends on the plan, billing cycle, active contacts, AI workload, and extras. Compare a forecast for the same campaign. An annual monthly equivalent and a month-to-month subscription are different commitments.",
    },
    {
      question: "Can both tools automate Instagram conversations?",
      answer:
        "Both publish Instagram automation offerings. Confirm the exact trigger, branching, AI features, and handoff included in the plan you are testing.",
    },
    {
      question: "Can either tool ignore Instagram's messaging windows?",
      answer: (
        <>
          No. Plan your workflow around Meta's applicable messaging rules. Our{" "}
          <Link href="/blog/instagram-dm-limits">DM limits guide</Link> explains
          the distinction between organic private replies, ongoing
          conversations, and eligible ad entry points.
        </>
      ),
    },
  ],
}
