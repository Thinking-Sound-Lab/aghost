import Link from "next/link"
import { POST_LIMITS } from "@workspace/api/contract"
import { ComparisonTable, Source, sources } from "./shared"
import type { ArticleContent } from "./types"

export const howToScheduleInstagramPosts: ArticleContent = {
  answer:
    "Yes, you can schedule Instagram posts and Reels from an eligible professional account in the Instagram app or through a scheduling tool. For Stories, check that your tool supports your account and the format you need. In aghost, choose your media, review the date and time zone, optionally attach a comment-to-DM automation to a post or Reel, and approve the campaign before scheduling it.",
  intro: (
    <>
      <p>
        A useful Instagram schedule includes the content, the publishing time,
        and what should happen when someone responds. If your Reel promises a
        guide to everyone who comments GUIDE, prepare that DM before the Reel
        goes live.
      </p>
      <p>
        This guide covers native scheduling, an aghost walkthrough, and the
        choices to check when evaluating a tool. We build aghost; references to
        Buffer, Postiz, and Blotato describe their published workflows, rather
        than a hands-on performance ranking.
      </p>
    </>
  ),
  sections: [
    {
      id: "choose-a-scheduling-method",
      title: "Choose how you want to schedule Instagram content",
      body: (
        <>
          <p>
            Start with your account and the finished post. Automatic publishing
            sends supported content without a final tap. Reminder publishing
            prompts you to finish it in Instagram. Those are different jobs,
            especially when your Story needs an interactive sticker or an
            Instagram-only editing feature.
          </p>
          <ComparisonTable
            caption="Choose a scheduling route for your Instagram workflow"
            headings={[
              "What you need",
              "Where to start",
              "Check before saving",
            ]}
            rows={[
              [
                "A post or Reel scheduled inside Instagram",
                "The Instagram app’s scheduling option",
                "Professional-account eligibility and the options shown for this post",
              ],
              [
                "A desktop calendar for photos, Reels, and carousels",
                "A scheduler connected to your professional account",
                "Media order, caption, account, publishing time, and time zone",
              ],
              [
                "A scheduled Story",
                "A tool that supports Story publishing for your account",
                "Whether it will publish automatically or needs you to finish it",
              ],
              [
                "A scheduled post with a comment-to-DM campaign",
                "aghost’s calendar and attached automation",
                "The trigger, DM text, and destination link as well as the post",
              ],
            ]}
          />
          <p>
            Buffer’s{" "}
            <Source href={sources.bufferInstagram}>Instagram help guide</Source>{" "}
            explains its automatic and notification routes. Support for a format
            does not mean every sticker, audio choice, or native effect can be
            added through every scheduler.
          </p>
        </>
      ),
    },
    {
      id: "schedule-in-the-instagram-app",
      title: "How to schedule a post or Reel in the Instagram app",
      body: (
        <>
          <ol>
            <li>Create a post or Reel and choose your media.</li>
            <li>Finish the edit and caption.</li>
            <li>
              Open More options and look for Schedule this post or Schedule this
              reel.
            </li>
            <li>Choose the date and time, then return to the composer.</li>
            <li>Review the post and select Schedule.</li>
          </ol>
          <p>
            Menu labels and eligibility can vary. Buffer’s{" "}
            <Source href={sources.bufferScheduling}>
              native scheduling walkthrough
            </Source>{" "}
            documents this route for professional accounts. If the option is
            missing, check your account type and the features used in the post
            before rebuilding it in another tool.
          </p>
        </>
      ),
    },
    {
      id: "schedule-with-aghost",
      title: "How to schedule Instagram posts, Reels, and Stories with aghost",
      body: (
        <>
          <p>
            Connect your Instagram professional account in Settings → Channels
            and open Calendar. You need an active{" "}
            <Link href="/pricing">aghost plan</Link> and publishing permission
            for the selected account.
          </p>
          <ol>
            <li>
              Select New post and check the Instagram account. If aghost asks
              you to reconnect for publishing permission, complete that first.
            </li>
            <li>
              Choose Post or reel, or Story. A single video in Post or reel
              publishes as a Reel; multiple media items make a carousel. A Story
              uses one photo or video and depends on your account’s publishing
              eligibility.
            </li>
            <li>
              Upload the finished media and review its order. Add a caption for
              a post or Reel. aghost accepts up to {POST_LIMITS.maxMediaItems}{" "}
              items in a carousel; that is aghost’s current allowance, not a
              claim about every Instagram publishing method.
            </li>
            <li>
              In When, choose the date and time. The composer displays your
              browser’s time zone. Convert your audience’s intended time if it
              differs, and allow at least {POST_LIMITS.minLeadMinutes} minutes
              before publishing.
            </li>
            <li>
              For a post or Reel, optionally enable Send a DM to people who
              comment. Set the keyword, response, and link button. Stories do
              not offer this attached comment automation.
            </li>
            <li>
              Review the media, caption, time, and any DM before selecting
              Schedule. This queues a real publication. Afterward, open the
              saved item in Calendar to check its details.
            </li>
          </ol>
          <p>
            For a download campaign, keep the promise specific: “Comment GUIDE
            for the checklist.” Use a DM such as “Here’s the checklist you asked
            for,” with a button leading to the actual resource. Our{" "}
            <Link href="/blog/instagram-auto-reply">auto reply guide</Link>{" "}
            covers response examples and when native replies are enough.
          </p>
        </>
      ),
    },
    {
      id: "schedule-with-an-ai-agent",
      title: "Ask your AI agent to prepare the campaign",
      body: (
        <>
          <p>
            If you already use Claude Code, Codex, or Cursor, connect it through
            the <Link href="/agents">aghost MCP setup guide</Link>. Give it the
            media, account, intended date, and time zone. Ask for a review
            before it schedules anything.
          </p>
          <blockquote>
            Prepare this Reel for my connected Instagram account next Friday at
            6 PM in Asia/Kolkata. Confirm the exact calendar date with me.
            Attach a comment-to-DM automation for the keyword GUIDE using the
            download URL I provide. Show me the media, caption, date, time zone,
            trigger, DM, and button URL. Wait for my approval before scheduling.
          </blockquote>
          <p>
            After you approve, check the saved post and attached automation in
            the dashboard. Before approval, review the agent’s proposed summary;
            an unscheduled proposal will not already be a saved calendar item.
          </p>
        </>
      ),
    },
    {
      id: "compare-scheduling-workflows",
      title: "What to check in Buffer, Postiz, and Blotato",
      body: (
        <>
          <p>
            Choose a workflow you can maintain. These tools overlap in their
            publishing features, so test the formats and editing steps you
            actually use. The summaries below were checked against vendor
            documentation on October 17, 2026.
          </p>
          <ComparisonTable
            caption="Instagram scheduling workflows described by each provider"
            headings={["Tool", "Documented workflow", "What to evaluate"]}
            rows={[
              [
                <Link key="aghost" href="/features#scheduling">
                  aghost
                </Link>,
                "Instagram calendar with optional comment-to-DM automation; dashboard, MCP, and REST access",
                "Schedule a post and prepare its promised DM together",
              ],
              [
                <Source key="buffer" href={sources.bufferInstagram}>
                  Buffer
                </Source>,
                "Instagram publishing with automatic and notification-based options",
                "Whether your post auto-publishes or needs a final edit in Instagram",
              ],
              [
                <Source key="postiz" href={sources.postizInstagram}>
                  Postiz
                </Source>,
                "A shared scheduling calendar, multiple social channels, and team approval workflows",
                "How collaborators review content and manage the calendar",
              ],
              [
                <Source key="blotato" href={sources.blotatoScheduling}>
                  Blotato
                </Source>,
                "API scheduling at a chosen timestamp or the next configured slot, including n8n and Make workflows",
                "How your content source, account, and time reach the publishing workflow",
              ],
            ]}
          />
          <p>
            Agent access is another feature to compare, rather than an aghost
            exclusive: <Source href={sources.postizInstagram}>Postiz</Source>{" "}
            and <Source href={sources.blotatoInstagramAgent}>Blotato</Source>{" "}
            also document MCP publishing workflows. Try one representative
            campaign before moving an entire calendar.
          </p>
        </>
      ),
    },
    {
      id: "find-and-edit-scheduled-posts",
      title: "How to find and edit scheduled Instagram posts",
      body: (
        <>
          <p>
            For Instagram’s native queue, look under Scheduled content in your
            profile menu. Select the item for its management options. Buffer
            documents this in its{" "}
            <Source href={sources.bufferScheduling}>
              native-post management guide
            </Source>
            .
          </p>
          <p>
            In aghost, open Calendar and select the saved post. While it is
            still scheduled, you can change its media, caption, or time. Follow
            Edit automation for an attached campaign. Once publishing starts,
            treat the item’s status and result as the source of truth instead of
            assuming it is still editable.
          </p>
          <p>
            A queued post is not proof of publication. After the intended time,
            check the status and use View on Instagram when a published link is
            available. If it failed, read the reported error before making a
            replacement, so you can check whether anything went live first.
          </p>
        </>
      ),
    },
    {
      id: "scheduling-troubleshooting",
      title: "Why you may be unable to schedule or publish",
      body: (
        <>
          <ComparisonTable
            caption="Checks for a scheduled Instagram campaign that needs attention"
            headings={["Problem", "First check"]}
            rows={[
              [
                "Scheduling is unavailable",
                "Check professional-account eligibility, your connection, and publishing permission. Review any reconnect prompt.",
              ],
              [
                "The post is set for the wrong time",
                "Compare the saved date and time zone with the intended audience time. Recheck after travel or a daylight-saving change.",
              ],
              [
                "The media cannot be published",
                "Read the media validation or publishing error. Check the selected format, file, and whether a native-only feature needs a different publishing route.",
              ],
              [
                "The post published but the DM did not send",
                "Check the attached automation, matching comment, message activity, and account permissions separately from the publishing status.",
              ],
            ]}
          />
          <p>
            Scheduling a post does not extend Instagram’s messaging permissions.
            A comment-triggered reply and later follow-ups have their own rules;
            review the{" "}
            <Link href="/blog/instagram-dm-limits">DM limits guide</Link> when
            planning what happens after publication.
          </p>
        </>
      ),
    },
    {
      id: "plan-one-week",
      title: "Plan one week of content and its responses",
      body: (
        <>
          <p>
            A small calendar is easier to review than a month of untested
            campaigns. Here is an example, not a recommended posting frequency
            or a prediction of reach.
          </p>
          <ComparisonTable
            caption="An example Instagram content plan"
            headings={["Day", "Content", "What to prepare"]}
            rows={[
              [
                "Monday",
                "Educational carousel",
                "Slides in order, a clear caption, and the intended publication time",
              ],
              [
                "Wednesday",
                "Guide Reel",
                "The video, a GUIDE call to action, and the matching DM button",
              ],
              [
                "Friday",
                "Behind-the-scenes Story",
                "A finished photo or video and a supported publishing route",
              ],
            ]}
          />
          <p>
            Choose times you can explain from your audience’s habits, then
            compare results across similar posts. Check both publication and the
            promised response. To start in aghost, review its{" "}
            <Link href="/features#scheduling">scheduling workflow</Link> and
            prepare one post before building the rest of your calendar.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "Can you schedule Instagram posts for free?",
      answer:
        "Eligible professional accounts can use Instagram’s native scheduling without a separate scheduler subscription. aghost requires an active plan; compare its current pricing before connecting an account.",
    },
    {
      question: "Can you schedule Instagram Stories?",
      answer:
        "Yes, with a supported publishing tool and eligible account. Check automatic publishing separately from reminder publishing, especially if the Story needs native stickers or interactive editing. aghost schedules a Story from one finished photo or video and does not attach comment-to-DM automation to it.",
    },
    {
      question: "Where do I find scheduled Instagram posts?",
      answer:
        "For native posts, look for Scheduled content in Instagram’s profile menu. For aghost posts, open Calendar. Use the original scheduling tool to review the saved item.",
    },
    {
      question:
        "Can I schedule a Reel and its comment-to-DM automation together?",
      answer:
        "Yes. In aghost, add the video in Post or reel and enable Send a DM to people who comment. Review the trigger, message, and link alongside the publishing time before selecting Schedule. An attached automation is for comments on a post or Reel, not a Story trigger.",
    },
    {
      question: "Can an AI agent schedule my Instagram posts?",
      answer:
        "Yes, when connected to a publishing service. aghost supports MCP and REST operations for scheduling. Give the agent the exact account, media, date, and time zone, and approve its summary before it schedules. Postiz and Blotato also document agent publishing workflows.",
    },
  ],
}
