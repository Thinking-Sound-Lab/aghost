import Link from "next/link"
import { ComparisonTable, Source, sources } from "./shared"
import type { ArticleContent } from "./types"

export const instagramDmLimits: ArticleContent = {
  answer:
    "Instagram DM limits depend on the action and API feature. For organic post and reel comments, Meta permits one private reply within seven days, with follow-ups after the recipient responds and within 24 hours of that response. API throughput, your automation tool's allowance, and account restrictions are separate limits.",
  intro: (
    <>
      <p>
        “How many Instagram DMs can I send?” sounds like a question with one
        number. In practice, a manual message, an automated response to an
        incoming DM, and a private reply to a reel comment follow different
        conditions. A subscription labeled unlimited does not change those
        conditions.
      </p>
      <p>
        This guide covers the rules relevant to professional-account automation,
        checked against Meta’s developer documentation on October 12, 2026. It
        does not prescribe a daily allowance for cold outreach.
      </p>
    </>
  ),
  sections: [
    {
      id: "four-limits",
      title: "Separate messaging permission from send capacity",
      body: (
        <>
          <ComparisonTable
            caption="Four different reasons an Instagram DM may not send"
            headings={["Limit", "What it controls", "What to check"]}
            rows={[
              [
                "Messaging eligibility",
                "Whether this person can receive this reply",
                "The trigger and user interaction",
              ],
              [
                "Messaging window",
                "When an eligible reply can be sent",
                "The comment or last-response time",
              ],
              [
                "API throughput",
                "How quickly an app can call an endpoint",
                "The endpoint's documented rate limit",
              ],
              [
                "Tool allowance or restriction",
                "Your plan's usage or account availability",
                "Billing, queues, permissions, and errors",
              ],
            ]}
          />
          <p>
            Start with eligibility. Capacity is relevant only after a message is
            allowed. Increasing a plan allowance cannot reopen an expired
            conversation, and slowing a queue cannot make an unsolicited
            campaign eligible.
          </p>
        </>
      ),
    },
    {
      id: "comment-private-replies",
      title: "The seven-day window for a comment private reply",
      body: (
        <>
          <p>
            Meta’s{" "}
            <Source href={sources.metaPrivateReplies}>
              private-reply documentation
            </Source>{" "}
            allows one initial message per comment, sent within seven days of an
            organic post or reel comment. Further messages require the recipient
            to respond and must be sent within 24 hours of that response.
            Live-comment private replies are limited to the broadcast.
          </p>
          <p>
            For example, a creator publishes a reel on Monday with “comment
            CHECKLIST for the download.” The automation should deliver the
            requested message promptly. If the recipient does nothing, the
            creator should not plan a sequence of reminders based only on that
            original comment.
          </p>
          <p>
            Treat the first message as a complete, useful response or a clear
            invitation to continue. If the workflow uses an opening button,
            explain what the button does. In aghost, the main message waits for
            the opening-button interaction when that option is enabled.
          </p>
        </>
      ),
    },
    {
      id: "messaging-windows",
      title: "The 24-hour rule and the ad-conversation exception",
      body: (
        <>
          <p>
            Meta’s{" "}
            <Source href={sources.metaMessaging}>Send Messages guide</Source>{" "}
            describes a standard window of 24 hours for most user actions. It
            also documents a possible window of up to seven days when a person
            sends their first message after clicking a Click-to-Direct ad. That
            exception concerns the specified ad entry point.
          </p>
          <p>
            Avoid mixing up three clocks: the comment’s age, the person’s latest
            response, and an eligible ad-started conversation. Record which
            event started the interaction before you schedule a follow-up. An
            organic comment campaign should follow its private-reply rules.
          </p>
          <p>
            In a customer-service workflow, a human support extension may also
            be relevant. Meta’s{" "}
            <Source href={sources.metaOverview}>platform overview</Source>{" "}
            describes the human_agent tag for permitted human support within
            seven days of the user’s message. It is not a basis for adding an
            automated promotional sequence to a comment campaign.
          </p>
          <p>
            For a simple resource campaign, keep the design simple: deliver what
            was requested, wait for the person’s interaction, and answer their
            next question while the applicable window remains open.
          </p>
        </>
      ),
    },
    {
      id: "api-rate-limits",
      title: "Meta's API limits are specific to the endpoint",
      body: (
        <>
          <p>
            The{" "}
            <Source href={sources.metaOverview}>
              Instagram Platform overview
            </Source>{" "}
            lists 750 private-reply calls per hour per professional account for
            post and reel comments. It separately lists 100 Send API calls per
            second per professional account for messages containing text, links,
            reactions, and stickers. These figures describe different
            operations.
          </p>
          <p>
            Neither figure is a promise that every queued message will arrive,
            or permission to start arbitrary conversations. Do not multiply an
            API rate into a proposed daily cold-DM quota. The application still
            needs valid permissions, an eligible recipient, and the applicable
            messaging window.
          </p>
          <p>
            Tools may pace deliveries below an API ceiling. Ask the provider
            which operation its queue performs and what happens when a queued
            reply approaches its deadline. A lower tool limit should be
            described as a tool limit, rather than presented as Instagram’s
            universal cap.
          </p>
        </>
      ),
    },
    {
      id: "daily-dm-limits",
      title: "Is there a universal Instagram DM limit per day?",
      body: (
        <>
          <p>
            The Meta documentation cited here specifies messaging windows and
            endpoint rates; it does not establish one daily number that applies
            to every manual and automated message. Claims such as “everyone can
            safely send 200 DMs a day” need a source and a clearly defined use
            case.
          </p>
          <p>
            If you are researching an Instagram message limit because your
            personal inbox stopped working, begin with the restriction or error
            shown in Instagram. An API throughput table for professional-account
            automation does not diagnose a personal-account messaging block.
          </p>
          <p>
            For automation, inspect the actual failure. A permissions problem,
            an expired window, and a throttled request require different fixes.
            Avoid repeatedly retrying a message that was rejected because it is
            no longer eligible.
          </p>
        </>
      ),
    },
    {
      id: "delivery-checklist",
      title: "A practical checklist when a DM does not arrive",
      body: (
        <>
          <ol>
            <li>
              Check the automation is active on the correct account and post,
              and that the comment matches its keyword rule.
            </li>
            <li>
              Check whether the first message has already been delivered, or
              whether the flow is waiting for an opening-button tap.
            </li>
            <li>
              Check any follower condition. A link held behind that condition
              has not necessarily failed to send.
            </li>
            <li>
              Read the provider error or activity entry. Separate expired
              eligibility from rate limits, permissions, and plan allowances.
            </li>
            <li>
              Ask the recipient to check message requests as well as the inbox.
              Delivery and visibility are different stages of the experience.
            </li>
            <li>
              Pause a campaign that is delivering the wrong resource, fix the
              rule, and test a fresh interaction before reactivating it.
            </li>
          </ol>
          <p>
            aghost exposes sent, waiting, and failed activity so you can inspect
            the campaign. Its{" "}
            <Link href="/pricing">flat subscription plans</Link> do not charge
            by contact or DM count, but Meta’s rules and fair use still apply.
            Plan your conversation around the audience’s request and the next
            interaction, then choose the capacity you need.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "Does a comment open the usual 24-hour DM window?",
      answer:
        "A comment permits the initial private-reply workflow. Further organic comment-triggered messages depend on the recipient responding; do not schedule a full sequence from the comment alone.",
    },
    {
      question: "Can an unlimited DM plan bypass Meta's rules?",
      answer:
        "No. A tool's billing allowance and Meta's messaging eligibility are separate. An unlimited subscription does not remove API limits or messaging windows.",
    },
    {
      question: "Is clicking a website link the same as responding in the DM?",
      answer:
        "Do not assume it is. Opening an external website and sending a conversation response are different actions. Use the interaction your tool documents for continuing the conversation; aghost provides an opening-message button for that flow.",
    },
  ],
}
