import { z } from "zod"
import type { ApiKeyScope } from "../../contract/api-key"
import type { ApiErrorCode } from "../../contract/errors"
import { PLATFORMS, PLATFORM_RULES } from "../../contract/platform"
import {
  ACTIVITY_PAGE_MAX_LIMIT,
  createAutomationSchema,
  setAutomationStatusSchema,
  updateAutomationSchema,
} from "../../contract/automation"
import { sendMessageSchema } from "../../contract/inbox"
import { insightInputSchema } from "../../contract/insights"
import {
  POST_LIMITS,
  createMediaUploadSchema,
  crossPostSchema,
  schedulePostSchema,
  scheduledPostRangeSchema,
  updateScheduledPostSchema,
} from "../../contract/post"
import type { AgentIdentity } from "../../http/context"
import {
  presentAccount,
  presentAutomation,
  presentScheduledPost,
  presentSocialSet,
  presentWorkspace,
} from "../../http/presenters"
import { validate } from "../../http/validation"
import { AppError, ForbiddenError } from "../../shared/errors"
import { actorOf } from "../analytics/analytics"

export type AgentOperation = {
  name: string
  description: string
  scope: ApiKeyScope
  schema: z.ZodObject
  destructive?: boolean
  /** Reads its input inside the recorded call, so invalid input counts as a failed call. */
  execute: (identity: AgentIdentity, input: () => unknown) => Promise<unknown>
}

/** Shared workspace actions; each transport owns its request handling. */
function operation<Schema extends z.ZodObject, Name extends string>(
  definition: Omit<AgentOperation, "name" | "schema" | "execute"> & {
    name: Name
    schema: Schema
    run: (
      identity: AgentIdentity,
      input: z.output<Schema>
    ) => unknown | Promise<unknown>
  }
): AgentOperation & { name: Name } {
  const { run, ...metadata } = definition
  return {
    ...metadata,
    execute: async (identity, input) => {
      const started = performance.now()
      const record = (error_code: ApiErrorCode | null) =>
        identity.services.analytics.capture(actorOf(identity.workspace), {
          name: "agent_tool_called",
          tool: definition.name,
          api_key_id: identity.apiKey.id,
          outcome: error_code ? "failed" : "succeeded",
          error_code,
          duration_ms: Math.round(performance.now() - started),
        })
      try {
        if (!identity.apiKey.scopes.includes(definition.scope)) {
          throw new ForbiddenError(definition.scope)
        }
        const result = await run(
          identity,
          validate(definition.schema, input()) as z.output<Schema>
        )
        record(null)
        return result
      } catch (error) {
        record(error instanceof AppError ? error.code : "internal_error")
        throw error
      }
    },
  }
}

const noInput = z.object({})
const automationId = z.object({ automationId: z.uuid() })
const postId = z.object({ postId: z.uuid() })
const accountId = z.object({ accountId: z.uuid() })
const thread = accountId.extend({
  conversationId: z
    .string()
    .min(1)
    .max(1000)
    .describe("Opaque conversation ID returned by list_conversations."),
})
const offsetSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER)
  .default(0)

const captionLimits = PLATFORMS.map(
  (platform) =>
    `${PLATFORM_RULES[platform].name} ${PLATFORM_RULES[platform].captionMaxLength.toLocaleString("en")}`
).join(", ")

export const AGENT_OPERATIONS = [
  operation({
    name: "get_workspace",
    description: "Get the workspace this API key belongs to.",
    scope: "workspace:read",
    schema: noInput,
    run: ({ workspace }) => presentWorkspace(workspace),
  }),
  operation({
    name: "list_social_sets",
    description:
      "List the workspace's social sets. A set groups one account on each platform, such as one brand; each account's socialSetId names its set.",
    scope: "accounts:read",
    schema: noInput,
    run: async ({ workspace, services }) =>
      (await services.socialSets.list(workspace)).map(presentSocialSet),
  }),
  operation({
    name: "list_accounts",
    description:
      "List the workspace's connected accounts on Instagram, Facebook, LinkedIn, X, Threads and YouTube, with each one's platform, connection status and socialSetId. A social set holds one account per platform; cross-post within one set unless the user asks otherwise.",
    scope: "accounts:read",
    schema: noInput,
    run: async ({ workspace, services }) =>
      (await services.accounts.list(workspace)).map(presentAccount),
  }),
  operation({
    name: "list_account_posts",
    description:
      "List recent posts for an Instagram account, to pick one for a comment-to-DM automation. Use platformPostId when targeting a specific post.",
    scope: "accounts:read",
    schema: accountId,
    run: ({ workspace, services }, { accountId }) =>
      services.accounts.listRecentPosts(workspace, accountId),
  }),
  operation({
    name: "get_account_insights",
    description:
      "Read the Analytics account report for 7, 30 or 90 UTC days including today (default 30), plus a page of published content, for an account on any platform. Instagram reports have summary account totals for the selected dates; reach is unique accounts and must not be summed across posts or days. Other platforms have totals: the lifetime metrics of posts published in the range, with daily values by publish date. Post metrics are lifetime totals for content published in the range. Null means unknown or not reported by that platform, not zero; recent account data may lag up to 48 hours. Returns reconnect_required or not_enabled when analytics access is unavailable.",
    scope: "accounts:read",
    schema: insightInputSchema,
    run: ({ workspace, services }, query) =>
      services.insights.getReport(workspace, query),
  }),
  operation({
    name: "list_content_insights",
    description:
      "Browse an account's published content and lifetime performance metrics, including views, reach, impressions, engagement and Instagram Reel watch time in seconds; metrics a platform does not report are null. Filter publication dates to 7, 30 or 90 UTC days including today, sort by a metric the platform reports or by date, and paginate with page (starting at 1) through pages. Use this for further pages without reloading account insights. Use each returned post's id for get_post_insights. Null metrics are unknown, not zero; unavailable access returns reconnect_required or not_enabled.",
    scope: "accounts:read",
    schema: insightInputSchema,
    run: ({ workspace, services }, query) =>
      services.insights.getContent(workspace, query),
  }),
  operation({
    name: "get_post_insights",
    description:
      "Read a published post's lifetime performance and view history. Use postId from the id returned by get_account_insights or list_content_insights, not a scheduled-post UUID or platformPostId. days selects 7, 30 or 90 UTC days of history (default 30). History points are snapshots of cumulative views, not new views per day. Reel watch time is in seconds; null means unknown. Verifies the post belongs to the workspace's account. Unavailable access returns reconnect_required or not_enabled.",
    scope: "accounts:read",
    schema: insightInputSchema.pick({ accountId: true, days: true }).extend({
      postId: z
        .string()
        .min(1)
        .max(200)
        .describe(
          "The opaque id returned in an analytics post, not platformPostId."
        ),
    }),
    run: ({ workspace, services }, { postId, ...query }) =>
      services.insights.getPost(workspace, postId, query),
  }),
  operation({
    name: "get_posting_times",
    description:
      "Read historical posting-time engagement slots from all available published-post history, independent of the report's days filter. dayOfWeek is Monday=0 through Sunday=6 and hour is UTC. averageEngagement is mean likes + comments + shares + saves per post; postCount is the sample size. Use referenceTime to convert the next occurrence into the user's timezone. For suggestions, require positive engagement and at least 3 posts per slot; these are historical signals, not guaranteed optimal times. Empty slots provide no evidence. Unavailable access returns reconnect_required or not_enabled.",
    scope: "accounts:read",
    schema: insightInputSchema.pick({ accountId: true }),
    run: ({ workspace, services }, query) =>
      services.insights.getPostingTimes(workspace, query),
  }),
  operation({
    name: "list_automations",
    description: "List all automations in this workspace.",
    scope: "automations:read",
    schema: noInput,
    run: async ({ workspace, services }) =>
      (await services.automations.list(workspace)).map(presentAutomation),
  }),
  operation({
    name: "get_automation_stats",
    description:
      "Get delivery and click counters keyed by automation ID. Null counters mean the provider did not report a value.",
    scope: "automations:read",
    schema: noInput,
    run: ({ workspace, services }) => services.automations.listStats(workspace),
  }),
  operation({
    name: "get_automation",
    description:
      "Get an automation's trigger, messages, product carousel, follow-up nudge, buttons, and status.",
    scope: "automations:read",
    schema: automationId,
    run: async ({ workspace, services }, { automationId }) =>
      presentAutomation(
        await services.automations.get(workspace, automationId)
      ),
  }),
  operation({
    name: "create_automation",
    description:
      "Create an Instagram comment-to-DM automation. Growth and Business allow productCarousel (1–10 cards, replaces the main text bubble; dmButtons must be empty). Business allows followUp (one reminder, 30–1200 minutes, optional link button; skipped after replies, clicks, or expiry of messaging consent). Active automations can send real DMs and public replies. Choose paused to review it first; an empty keywords array matches every comment. A scheduled_post trigger answers comments on a post from list_scheduled_posts once it is published.",
    scope: "automations:write",
    schema: createAutomationSchema,
    run: async ({ workspace, services }, input) =>
      presentAutomation(await services.automations.create(workspace, input)),
  }),
  operation({
    name: "update_automation",
    description:
      "Replace an automation's full configuration. Read it first and preserve fields that should stay the same. An active status enables real delivery.",
    scope: "automations:write",
    schema: automationId.extend({ input: updateAutomationSchema }),
    destructive: true,
    run: async ({ workspace, services }, { automationId, input }) =>
      presentAutomation(
        await services.automations.update(workspace, automationId, input)
      ),
  }),
  operation({
    name: "set_automation_status",
    description:
      "Pause or activate an automation. Activating enables real DMs and any configured public replies.",
    scope: "automations:write",
    schema: automationId.extend(setAutomationStatusSchema.shape),
    destructive: true,
    run: async ({ workspace, services }, { automationId, status }) =>
      presentAutomation(
        await services.automations.setStatus(workspace, automationId, status)
      ),
  }),
  operation({
    name: "delete_automation",
    description:
      "Permanently delete an automation, stopping it at the provider first.",
    scope: "automations:write",
    schema: automationId,
    destructive: true,
    run: ({ workspace, services }, { automationId }) =>
      services.automations.delete(workspace, automationId),
  }),
  operation({
    name: "list_automation_activity",
    description:
      "Get paginated comment activity and delivery outcomes for one automation, newest first.",
    scope: "automations:read",
    schema: automationId.extend({
      limit: z.number().int().min(1).max(ACTIVITY_PAGE_MAX_LIMIT).default(25),
      offset: offsetSchema,
    }),
    run: ({ workspace, services }, { automationId, limit, offset }) =>
      services.automations.listActivity(workspace, automationId, {
        limit,
        offset,
      }),
  }),
  operation({
    name: "list_scheduled_posts",
    description: `List posts scheduled through aghost whose time falls in [from, to), earliest first, with their publishing status. Periods can be up to ${POST_LIMITS.maxRangeDays} days.`,
    scope: "posts:read",
    schema: scheduledPostRangeSchema,
    run: async ({ workspace, services }, range) =>
      (await services.posts.list(workspace, range)).map(presentScheduledPost),
  }),
  operation({
    name: "get_scheduled_post",
    description:
      "Get a scheduled post's platform, account, content, time, Trial Reel launch settings, YouTube title and the automations that answer its comments. trialReel is launch intent, not current graduation status. Once published it has a platformPostId and permalink; a failed post has an error.",
    scope: "posts:read",
    schema: postId,
    run: async ({ workspace, services }, { postId }) =>
      presentScheduledPost(await services.posts.get(workspace, postId)),
  }),
  operation({
    name: "create_media_upload",
    description:
      "Get a one-hour URL to upload a photo or video for a post. PUT the file's bytes to uploadUrl with the same Content-Type header, then pass the returned media object in schedule_post or cross_post. Media already at a public https URL needs no upload. If the file is on the user's device, or you can't reach uploadUrl, for example because your sandbox's network blocks it, use create_upload_link instead.",
    scope: "posts:write",
    schema: createMediaUploadSchema,
    run: ({ services }, input) => services.posts.createUpload(input),
  }),
  operation({
    name: "create_upload_link",
    description: `Get a page where the user uploads photos and videos for a post from their browser, for files you can't upload yourself. Give the user the url and ask them to tell you when they have uploaded; the page takes files for ${POST_LIMITS.uploadLinkHours} hours. Then read the link with get_upload_link and pass its media to schedule_post or cross_post.`,
    scope: "posts:write",
    schema: noInput,
    run: ({ workspace, services }) => services.uploadLinks.create(workspace),
  }),
  operation({
    name: "get_upload_link",
    description:
      "Get an upload link's status: waiting, uploaded or expired. Once uploaded, media lists the user's files in their order, ready to pass to schedule_post or cross_post.",
    scope: "posts:read",
    schema: z.object({ uploadLinkId: z.uuid() }),
    run: ({ workspace, services }, { uploadLinkId }) =>
      services.uploadLinks.get(workspace, uploadLinkId),
  }),
  operation({
    name: "schedule_post",
    description: `Schedule an Instagram post or story for at least ${POST_LIMITS.minLeadMinutes} minutes from now; it publishes for real at that time. instagramAccountId must be an Instagram account; use cross_post for Facebook, LinkedIn, X, Threads and YouTube, or for several accounts at once. A post with one video publishes as a reel, and 2-10 items as a carousel. To create a Trial Reel, use kind post, exactly one video, and trialReel: {graduationStrategy: manual or automatic}. manual lets the owner share with everyone later in Instagram; automatic lets Instagram share based on performance with non-followers. Omit trialReel or use null for a regular post. Pass automation to answer comments on the post once it is published (requires automations:write); null schedules the post alone.`,
    scope: "posts:write",
    schema: schedulePostSchema,
    run: async ({ workspace, services, apiKey }, input) => {
      if (input.automation && !apiKey.scopes.includes("automations:write"))
        throw new ForbiddenError("automations:write")
      return presentScheduledPost(
        await services.posts.schedule(workspace, input)
      )
    },
  }),
  operation({
    name: "cross_post",
    description: `Schedule one post on one or more accounts on any platform, for at least ${POST_LIMITS.minLeadMinutes} minutes from now; each account gets its own scheduled post that publishes for real at that time. targets lists account ids from list_accounts. A target's caption replaces the shared caption on that account, such as a shorter one for X; null keeps the shared one. Caption limits: ${captionLimits}. YouTube needs one video and youtube: {title, madeForKids} on its target; Instagram needs a photo or video; Facebook, LinkedIn and X take several photos or one video, X up to ${PLATFORM_RULES.twitter.maxMedia} photos. Stories are Instagram only. trialReel and automation apply to the Instagram copies, and the others publish as plain posts. Every copy is checked before any is scheduled, and all are scheduled or none; errors name the target, such as targets.0.caption. Pass automation to answer comments on the Instagram copies (requires automations:write).`,
    scope: "posts:write",
    schema: crossPostSchema,
    run: async ({ workspace, services, apiKey }, input) => {
      if (input.automation && !apiKey.scopes.includes("automations:write"))
        throw new ForbiddenError("automations:write")
      return (await services.posts.crossPost(workspace, input)).map(
        presentScheduledPost
      )
    },
  }),
  operation({
    name: "update_scheduled_post",
    description:
      "Replace a scheduled post's caption, media and time, optionally adding an automation with automations:write on an Instagram post. The post's platform rules apply, such as 280 characters on X; set youtube to {title, madeForKids} on a YouTube video, or omit it to keep them. Set trialReel to {graduationStrategy: manual or automatic} for a Trial Reel with exactly one video, null for a regular reel, or omit it to preserve its settings. If adding an automation fails, the previous content and Trial Reel settings are restored. Only posts still waiting to publish can change, and kind must stay the same. Read it first and preserve fields that should stay the same.",
    scope: "posts:write",
    schema: postId.extend({ input: updateScheduledPostSchema }),
    destructive: true,
    run: async ({ workspace, services, apiKey }, { postId, input }) => {
      if (input.automation && !apiKey.scopes.includes("automations:write"))
        throw new ForbiddenError("automations:write")
      return presentScheduledPost(
        await services.posts.update(workspace, postId, input)
      )
    },
  }),
  operation({
    name: "delete_scheduled_post",
    description:
      "Cancel a scheduled or failed post and delete the automations attached to it, which also requires automations:write. Published posts stay on their platform and cannot be deleted here.",
    scope: "posts:write",
    destructive: true,
    schema: postId,
    run: async ({ workspace, services, apiKey }, { postId }) => {
      await services.posts.delete(
        workspace,
        postId,
        apiKey.scopes.includes("automations:write")
      )
    },
  }),
  operation({
    name: "list_contacts",
    description:
      "Search the contacts of one social set, or the first set when socialSetId is omitted; list_social_sets returns the ids. Returns up to 50 contacts with total and hasMore for pagination.",
    scope: "contacts:read",
    schema: z.object({
      search: z.string().trim().max(100).default(""),
      socialSetId: z.uuid().optional(),
      offset: offsetSchema,
    }),
    run: ({ workspace, services }, query) =>
      services.contacts.list(workspace, query),
  }),
  operation({
    name: "list_conversations",
    description:
      "List Instagram DM conversations belonging to this workspace's accounts.",
    scope: "inbox:read",
    schema: noInput,
    run: ({ workspace, services }) =>
      services.inbox.listConversations(workspace),
  }),
  operation({
    name: "list_messages",
    description:
      "Read messages in a conversation. Use its instagramAccountId as accountId and its opaque id as conversationId.",
    scope: "inbox:read",
    schema: thread,
    run: ({ workspace, services }, { accountId, conversationId }) =>
      services.inbox.listMessages(workspace, accountId, conversationId),
  }),
  operation({
    name: "send_message",
    description:
      "Send a real Instagram DM to an existing conversation. Requires inbox:write; provider messaging restrictions apply. Do not retry an uncertain delivery automatically.",
    scope: "inbox:write",
    schema: thread.extend(sendMessageSchema.shape),
    run: ({ workspace, services }, { accountId, conversationId, text }) =>
      services.inbox.sendMessage(workspace, accountId, conversationId, text),
  }),
] as const
