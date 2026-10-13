import Link from "next/link"
import { AUTOMATION_LIMITS } from "@workspace/api/contract"
import { ComparisonTable, Source, sources } from "./shared"
import type { ArticleContent } from "./types"

export const instagramAutoReply: ArticleContent = {
  answer:
    "For a basic Instagram auto reply, open Meta Business Suite, choose Inbox → Automations → Create automation, and configure an auto reply or away message for Instagram if offered. For comment-triggered DMs, check the native Comment to message option or use a dedicated comment-to-DM tool.",
  intro: (
    <>
      <p>
        Someone asks for your opening hours while you are working. Someone else
        comments “GUIDE” on your reel. Both need a reply, but they need
        different kinds of automation. A welcome message answers an incoming DM.
        A comment-to-DM campaign delivers a resource requested under a post.
      </p>
      <p>
        Start with the action your audience takes, then choose the reply that
        helps them. This guide covers native setup, a comment campaign in
        aghost, message examples, and the checks to make before you turn
        anything on.
      </p>
    </>
  ),
  sections: [
    {
      id: "choose-your-reply",
      title: "Which kind of Instagram auto reply do you need?",
      body: (
        <>
          <ComparisonTable
            caption="Match the reply to the audience's action"
            headings={["Audience action", "Useful reply", "Starting point"]}
            rows={[
              [
                "Sends a new DM",
                "Acknowledge the message",
                "Native instant reply",
              ],
              [
                "Messages outside working hours",
                "Explain when you will answer",
                "Native away reply",
              ],
              [
                "Asks a repeated question",
                "Give an approved answer",
                "A saved reply or keyword workflow",
              ],
              [
                "Comments GUIDE on a reel",
                "Deliver the requested resource",
                "Comment-to-DM automation",
              ],
              [
                "Asks a detailed buying question",
                "Answer or hand off to a person",
                "An inbox or a reviewed AI workflow",
              ],
            ]}
          />
          <p>
            A saved reply is a reusable message you choose yourself; it does not
            automatically send just because somebody comments. Keep that
            distinction in mind when a tutorial promises “automatic replies”
            without showing the trigger.
          </p>
        </>
      ),
    },
    {
      id: "meta-business-suite",
      title: "Set up a basic reply in Meta Business Suite",
      body: (
        <>
          <p>
            <Source href={sources.metaInboxAutomations}>
              Meta’s native automation guide
            </Source>{" "}
            explains how to manage connected business messaging. The options
            shown depend on your account and its permissions. Use the following
            as a setup checklist, and confirm that Instagram is selected before
            saving.
          </p>
          <ol>
            <li>
              Open the business that owns your connected Instagram account.
            </li>
            <li>
              Go to Inbox, then Automations, and choose Create automation.
            </li>
            <li>
              Choose Auto reply (also called Instant reply), or Away message for
              a response outside your working hours.
            </li>
            <li>
              Select Instagram when it is available as a channel. A rule that
              only selects Messenger will not answer your Instagram audience.
            </li>
            <li>
              Write a short acknowledgment. For an away message, set the
              schedule and time zone you actually work in.
            </li>
            <li>
              Save the rule and test it from a separate Instagram account.
            </li>
          </ol>
          <p>
            If Instagram is missing, check which business you opened, whether
            the account is connected, and whether you have access to its inbox.
            Avoid reconnecting everything as your first troubleshooting step:
            first identify the missing channel or permission.
          </p>
          <p>
            The guide also lists Comment to message for keyword-based post
            replies. Inspect whether Instagram is offered for that rule in your
            account. If it meets your campaign needs, test the native option
            before adding another tool. Compare tracking, follower conditions,
            and how you want to operate campaigns when evaluating a dedicated
            product.
          </p>
        </>
      ),
    },
    {
      id: "comment-to-dm",
      title: "Send an automatic DM when someone comments",
      body: (
        <>
          <p>
            For “comment GUIDE and I’ll send you the checklist,” make the
            promise specific. Use one resource, one keyword, and one next
            action. In aghost, the account must be an Instagram Business or
            Creator account, and the workspace needs an active plan.
          </p>
          <ol>
            <li>
              Connect your professional Instagram account through its
              authorization flow, then create an automation.
            </li>
            <li>
              Select the post or reel for this campaign. Start with one post so
              the same keyword on another post does not deliver the wrong link.
            </li>
            <li>
              Add GUIDE as a keyword. New automations in the dashboard use
              whole-word matching, so comments such as “GUIDE please” also
              match. To require a comment containing only the keyword, use MCP
              or REST to set exact matching.
            </li>
            <li>
              Write the DM and add a clear link button. aghost supports up to{" "}
              {AUTOMATION_LIMITS.maxDmButtons} link buttons per message; one is
              often enough for a resource campaign.
            </li>
            <li>
              Decide whether to use an opening DM that waits for a button tap,
              an optional public reply, or a follower requirement.
            </li>
            <li>
              Preview the conversation, activate it, and test the full route
              from a fresh comment to the destination page.
            </li>
          </ol>
          <p>
            An opening DM introduces an extra step. If you choose it, label the
            button with the requested action, such as “Send the guide.” A
            follower requirement introduces another condition, so make that
            condition clear in the post before people comment.
          </p>
          <p>
            An AI agent can also create or edit this campaign through aghost’s{" "}
            <Link href="/agents">MCP or REST access</Link>. Your agent operates
            the automation; you still decide the resource, audience, wording,
            and whether it should be active.
          </p>
        </>
      ),
    },
    {
      id: "reply-examples",
      title: "Instagram auto reply examples you can adapt",
      body: (
        <>
          <h3>Instant acknowledgment</h3>
          <blockquote>
            Thanks for your message! We read DMs Monday to Friday, 10am–6pm IST.
            Send your question here and we’ll reply during those hours.
          </blockquote>
          <h3>Away message</h3>
          <blockquote>
            We’re away for the evening. We’ll be back tomorrow at 10am IST. If
            you’re asking about an order, please include your order number.
          </blockquote>
          <h3>Resource delivery after a comment</h3>
          <blockquote>
            Here’s the checklist you asked for. Tap “Open the checklist” below
            to see the five steps from the reel.
          </blockquote>
          <h3>Optional public reply</h3>
          <blockquote>
            Sent you the checklist in a DM. Check your message requests too.
          </blockquote>
          <p>
            Replace the hours, time zone, and resource with your real details.
            Promise a response time you can meet. Avoid asking people to send
            sensitive information in a general welcome message.
          </p>
        </>
      ),
    },
    {
      id: "test-and-measure",
      title: "Check the conversation before you scale it",
      body: (
        <>
          <p>
            Use two test comments: one that should match and one that should
            not. Confirm the right account, post, keyword, DM, and link. If the
            flow includes an opening button or follower condition, test both
            branches rather than stopping after the first message arrives.
          </p>
          <p>
            In aghost, review the activity log for sent messages, failures, and
            messages waiting for a tap. Track link clicks separately from sales.
            Add campaign parameters to the destination URL and use your
            website’s analytics to see whether people complete the sign-up or
            purchase.
          </p>
          <p>
            Organic comment campaigns use Meta’s private-reply rules: the
            initial reply is limited, and further automated conversation depends
            on user interaction. See the{" "}
            <Source href={sources.metaPrivateReplies}>
              official private-reply guide
            </Source>{" "}
            and our{" "}
            <Link href="/blog/instagram-dm-limits">DM limits explanation</Link>{" "}
            before designing follow-ups.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "Can I set up Instagram auto replies for free?",
      answer:
        "Start by checking the native inbox automations available in Meta Business Suite. Third-party free plans have their own allowances. aghost requires a paid plan.",
    },
    {
      question: "Does aghost auto-reply to every incoming DM?",
      answer:
        "aghost's automatic trigger is a comment on a post or reel. You can read and answer conversations in its inbox, including through an agent, but it does not provide a general automatic FAQ bot for every incoming DM.",
    },
    {
      question: "Why did my comment automation send only the opening message?",
      answer:
        "If an opening DM is enabled, the resource message waits for the commenter to tap its button. Check the activity log and any follower requirement before treating that state as a delivery failure.",
    },
  ],
}
