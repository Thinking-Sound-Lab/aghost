import { z } from "zod"
import type { ApiKeyScope } from "../../contract/api-key"
import type { ApiErrorCode } from "../../contract/errors"
import {
  ACTIVITY_PAGE_MAX_LIMIT,
  createAutomationSchema,
  setAutomationStatusSchema,
  updateAutomationSchema,
} from "../../contract/automation"
import { sendMessageSchema } from "../../contract/inbox"
import {
  POST_LIMITS,
  createMediaUploadSchema,
  schedulePostSchema,
  scheduledPostRangeSchema,
  updateScheduledPostSchema,
} from "../../contract/post"
import type { AgentIdentity } from "../../http/context"
import {
  presentAccount,
  presentAutomation,
  presentScheduledPost,
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

export const AGENT_OPERATIONS = [
  operation({
    name: "get_workspace",
    description: "Get the workspace this API key belongs to.",
    scope: "workspace:read",
    schema: noInput,
    run: ({ workspace }) => presentWorkspace(workspace),
  }),
  operation({
    name: "list_accounts",
    description:
      "List the workspace's Instagram accounts and connection status.",
    scope: "accounts:read",
    schema: noInput,
    run: async ({ workspace, services }) =>
      (await services.accounts.list(workspace)).map(presentAccount),
  }),
  operation({
    name: "list_account_posts",
    description:
      "List recent posts for an Instagram account. Use platformPostId when targeting a specific post.",
    scope: "accounts:read",
    schema: accountId,
    run: ({ workspace, services }, { accountId }) =>
      services.accounts.listRecentPosts(workspace, accountId),
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
    description: "Get an automation's trigger, messages, buttons, and status.",
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
      "Create an Instagram comment-to-DM automation. Active automations can send real DMs and public replies. Choose paused to review it first; an empty keywords array matches every comment. A scheduled_post trigger answers comments on a post from list_scheduled_posts once it is published.",
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
      "Get a scheduled post's content, time, publishing status and the automations that answer its comments. Once published it has a platformPostId and permalink; a failed post has an error.",
    scope: "posts:read",
    schema: postId,
    run: async ({ workspace, services }, { postId }) =>
      presentScheduledPost(await services.posts.get(workspace, postId)),
  }),
  operation({
    name: "create_media_upload",
    description:
      "Get a one-hour URL to upload a photo or video for a post. PUT the file's bytes to uploadUrl with the same Content-Type header, then pass the returned media object in schedule_post. Media already at a public https URL needs no upload.",
    scope: "posts:write",
    schema: createMediaUploadSchema,
    run: ({ services }, input) => services.posts.createUpload(input),
  }),
  operation({
    name: "schedule_post",
    description: `Schedule an Instagram post or story for at least ${POST_LIMITS.minLeadMinutes} minutes from now; it publishes for real at that time. A post with one video publishes as a reel, and 2-10 items as a carousel. Pass automation to answer comments on the post once it is published (requires automations:write); null schedules the post alone.`,
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
    name: "update_scheduled_post",
    description:
      "Replace a scheduled post's caption, media and time, optionally adding an automation with automations:write. If that automation fails, the previous post is restored. Only posts still waiting to publish can change, and kind must stay the same. Read it first and preserve fields that should stay the same.",
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
      "Cancel a scheduled or failed post and delete the automations attached to it, which also requires automations:write. Published posts stay on Instagram and cannot be deleted here.",
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
      "Search contacts in this workspace. Returns up to 50 contacts with total and hasMore for pagination.",
    scope: "contacts:read",
    schema: z.object({
      search: z.string().trim().max(100).default(""),
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
