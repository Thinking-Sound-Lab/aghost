import type { FastifyRequest, HTTPMethods } from "fastify"
import { z } from "zod"
import type { ApiKeyScope } from "../../contract/api-key"
import {
  ACTIVITY_PAGE_MAX_LIMIT,
  activityPageQuerySchema,
  createAutomationSchema,
  setAutomationStatusSchema,
  updateAutomationSchema,
} from "../../contract/automation"
import { contactPageQuerySchema } from "../../contract/contact"
import { sendMessageSchema } from "../../contract/inbox"
import type { AgentIdentity } from "../../http/context"
import {
  presentAccount,
  presentAutomation,
  presentWorkspace,
} from "../../http/presenters"
import { validate } from "../../http/validation"
import { ForbiddenError } from "../../shared/errors"

export type AgentOperation = {
  name: string
  description: string
  scope: ApiKeyScope
  schema: z.ZodObject
  method: HTTPMethods
  path: string
  status?: number
  requestInput: (request: FastifyRequest) => unknown
  execute: (identity: AgentIdentity, input: unknown) => Promise<unknown>
}

/** One definition drives REST and MCP, including validation and permissions. */
function operation<Schema extends z.ZodObject>(
  definition: Omit<AgentOperation, "schema" | "execute"> & {
    schema: Schema
    run: (
      identity: AgentIdentity,
      input: z.output<Schema>
    ) => unknown | Promise<unknown>
  }
): AgentOperation {
  const { run, ...metadata } = definition
  return {
    ...metadata,
    execute: async (identity, input) => {
      if (!identity.apiKey.scopes.includes(definition.scope)) {
        throw new ForbiddenError(definition.scope)
      }
      return run(
        identity,
        validate(definition.schema, input) as z.output<Schema>
      )
    },
  }
}

const noInput = z.object({})
const automationId = z.object({ automationId: z.uuid() })
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
const params = (request: FastifyRequest) => request.params
const body = (request: FastifyRequest) => request.body
const empty = () => ({})

export const AGENT_OPERATIONS: AgentOperation[] = [
  operation({
    name: "get_workspace",
    description: "Get the workspace this API key belongs to.",
    scope: "workspace:read",
    schema: noInput,
    method: "GET",
    path: "/workspace",
    requestInput: empty,
    run: ({ workspace }) => presentWorkspace(workspace),
  }),
  operation({
    name: "list_accounts",
    description:
      "List the workspace's Instagram accounts and connection status.",
    scope: "accounts:read",
    schema: noInput,
    method: "GET",
    path: "/accounts",
    requestInput: empty,
    run: async ({ workspace, services }) =>
      (await services.accounts.list(workspace)).map(presentAccount),
  }),
  operation({
    name: "list_account_posts",
    description:
      "List recent posts for an Instagram account. Use platformPostId when targeting a specific post.",
    scope: "accounts:read",
    schema: accountId,
    method: "GET",
    path: "/accounts/:accountId/posts",
    requestInput: params,
    run: ({ workspace, services }, { accountId }) =>
      services.accounts.listRecentPosts(workspace, accountId),
  }),
  operation({
    name: "list_automations",
    description: "List all automations in this workspace.",
    scope: "automations:read",
    schema: noInput,
    method: "GET",
    path: "/automations",
    requestInput: empty,
    run: async ({ workspace, services }) =>
      (await services.automations.list(workspace)).map(presentAutomation),
  }),
  operation({
    name: "get_automation_stats",
    description:
      "Get delivery and click counters keyed by automation ID. Null counters mean the provider did not report a value.",
    scope: "automations:read",
    schema: noInput,
    method: "GET",
    path: "/automations/stats",
    requestInput: empty,
    run: ({ workspace, services }) => services.automations.listStats(workspace),
  }),
  operation({
    name: "get_automation",
    description: "Get an automation's trigger, messages, buttons, and status.",
    scope: "automations:read",
    schema: automationId,
    method: "GET",
    path: "/automations/:automationId",
    requestInput: params,
    run: async ({ workspace, services }, { automationId }) =>
      presentAutomation(
        await services.automations.get(workspace, automationId)
      ),
  }),
  operation({
    name: "create_automation",
    description:
      "Create an Instagram comment-to-DM automation. Active automations can send real DMs and public replies. Choose paused to review it first; an empty keywords array matches every comment.",
    scope: "automations:write",
    schema: createAutomationSchema,
    method: "POST",
    path: "/automations",
    status: 201,
    requestInput: body,
    run: async ({ workspace, services }, input) =>
      presentAutomation(await services.automations.create(workspace, input)),
  }),
  operation({
    name: "update_automation",
    description:
      "Replace an automation's full configuration. Read it first and preserve fields that should stay the same. An active status enables real delivery.",
    scope: "automations:write",
    schema: automationId.extend({ input: updateAutomationSchema }),
    method: "PATCH",
    path: "/automations/:automationId",
    requestInput: (request) => ({
      ...(request.params as object),
      input: request.body,
    }),
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
    method: "PATCH",
    path: "/automations/:automationId/status",
    requestInput: (request) => ({
      ...(request.body as object),
      ...(request.params as object),
    }),
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
    method: "DELETE",
    path: "/automations/:automationId",
    status: 204,
    requestInput: params,
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
    method: "GET",
    path: "/automations/:automationId/activity",
    requestInput: (request) => ({
      ...(request.params as object),
      ...validate(activityPageQuerySchema, {
        limit: "25",
        offset: "0",
        ...(request.query as object),
      }),
    }),
    run: ({ workspace, services }, { automationId, limit, offset }) =>
      services.automations.listActivity(workspace, automationId, {
        limit,
        offset,
      }),
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
    method: "GET",
    path: "/contacts",
    requestInput: (request) => validate(contactPageQuerySchema, request.query),
    run: ({ workspace, services }, query) =>
      services.contacts.list(workspace, query),
  }),
  operation({
    name: "list_conversations",
    description:
      "List Instagram DM conversations belonging to this workspace's accounts.",
    scope: "inbox:read",
    schema: noInput,
    method: "GET",
    path: "/inbox",
    requestInput: empty,
    run: ({ workspace, services }) =>
      services.inbox.listConversations(workspace),
  }),
  operation({
    name: "list_messages",
    description:
      "Read messages in a conversation. Use its instagramAccountId as accountId and its opaque id as conversationId.",
    scope: "inbox:read",
    schema: thread,
    method: "GET",
    path: "/inbox/:accountId/:conversationId",
    requestInput: params,
    run: ({ workspace, services }, { accountId, conversationId }) =>
      services.inbox.listMessages(workspace, accountId, conversationId),
  }),
  operation({
    name: "send_message",
    description:
      "Send a real Instagram DM to an existing conversation. Requires inbox:write; provider messaging restrictions apply. Do not retry an uncertain delivery automatically.",
    scope: "inbox:write",
    schema: thread.extend(sendMessageSchema.shape),
    method: "POST",
    path: "/inbox/:accountId/:conversationId",
    status: 204,
    requestInput: (request) => ({
      ...(request.body as object),
      ...(request.params as object),
    }),
    run: ({ workspace, services }, { accountId, conversationId, text }) =>
      services.inbox.sendMessage(workspace, accountId, conversationId, text),
  }),
]
