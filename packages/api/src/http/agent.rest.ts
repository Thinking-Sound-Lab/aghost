import type { FastifyRequest, HTTPMethods } from "fastify"
import { activityPageQuerySchema } from "../contract/automation"
import { contactPageQuerySchema } from "../contract/contact"
import {
  insightPostQuerySchema,
  insightQuerySchema,
} from "../contract/insights"
import {
  AGENT_OPERATIONS,
  type AgentOperation,
} from "../modules/agents/operations"
import { validate } from "./validation"

type RestRoute = {
  operation: AgentOperation
  method: HTTPMethods
  path: string
  status?: number
  requestInput: (request: FastifyRequest) => unknown
}

function route(
  name: (typeof AGENT_OPERATIONS)[number]["name"],
  binding: Omit<RestRoute, "operation">
): RestRoute {
  const operation = AGENT_OPERATIONS.find(
    (operation) => operation.name === name
  )
  if (!operation) throw new Error(`Unknown agent operation: ${name}`)
  return { operation, ...binding }
}

const params = (request: FastifyRequest) => request.params
const body = (request: FastifyRequest) => request.body
const empty = () => ({})

/** HTTP methods, paths, statuses and input conversion belong only to REST. */
export const AGENT_REST_ROUTES: RestRoute[] = [
  route("get_workspace", {
    method: "GET",
    path: "/workspace",
    requestInput: empty,
  }),
  route("list_social_sets", {
    method: "GET",
    path: "/social-sets",
    requestInput: empty,
  }),
  route("list_accounts", {
    method: "GET",
    path: "/accounts",
    requestInput: empty,
  }),
  route("list_account_posts", {
    method: "GET",
    path: "/accounts/:accountId/posts",
    requestInput: params,
  }),
  route("get_account_insights", {
    method: "GET",
    path: "/insights",
    requestInput: (request) => validate(insightQuerySchema, request.query),
  }),
  route("list_content_insights", {
    method: "GET",
    path: "/insights/content",
    requestInput: (request) => validate(insightQuerySchema, request.query),
  }),
  route("get_post_insights", {
    method: "GET",
    path: "/insights/posts/:postId",
    requestInput: (request) => ({
      ...validate(insightPostQuerySchema, request.query),
      ...(request.params as object),
    }),
  }),
  route("get_posting_times", {
    method: "GET",
    path: "/insights/posting-times",
    requestInput: (request) => request.query,
  }),
  route("list_automations", {
    method: "GET",
    path: "/automations",
    requestInput: empty,
  }),
  route("get_automation_stats", {
    method: "GET",
    path: "/automations/stats",
    requestInput: empty,
  }),
  route("get_automation", {
    method: "GET",
    path: "/automations/:automationId",
    requestInput: params,
  }),
  route("create_automation", {
    method: "POST",
    path: "/automations",
    status: 201,
    requestInput: body,
  }),
  route("update_automation", {
    method: "PATCH",
    path: "/automations/:automationId",
    requestInput: (request) => ({
      ...(request.params as object),
      input: request.body,
    }),
  }),
  route("set_automation_status", {
    method: "PATCH",
    path: "/automations/:automationId/status",
    requestInput: (request) => ({
      ...(request.body as object),
      ...(request.params as object),
    }),
  }),
  route("delete_automation", {
    method: "DELETE",
    path: "/automations/:automationId",
    status: 204,
    requestInput: params,
  }),
  route("list_automation_activity", {
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
  }),
  route("list_scheduled_posts", {
    method: "GET",
    path: "/scheduled-posts",
    requestInput: (request) => request.query,
  }),
  route("get_scheduled_post", {
    method: "GET",
    path: "/scheduled-posts/:postId",
    requestInput: params,
  }),
  route("schedule_post", {
    method: "POST",
    path: "/scheduled-posts",
    status: 201,
    requestInput: body,
  }),
  route("cross_post", {
    method: "POST",
    path: "/scheduled-posts/batch",
    status: 201,
    requestInput: body,
  }),
  route("update_scheduled_post", {
    method: "PATCH",
    path: "/scheduled-posts/:postId",
    requestInput: (request) => ({
      ...(request.params as object),
      input: request.body,
    }),
  }),
  route("delete_scheduled_post", {
    method: "DELETE",
    path: "/scheduled-posts/:postId",
    status: 204,
    requestInput: params,
  }),
  route("create_media_upload", {
    method: "POST",
    path: "/media/uploads",
    status: 201,
    requestInput: body,
  }),
  route("create_upload_link", {
    method: "POST",
    path: "/upload-links",
    status: 201,
    requestInput: empty,
  }),
  route("get_upload_link", {
    method: "GET",
    path: "/upload-links/:uploadLinkId",
    requestInput: params,
  }),
  route("list_contacts", {
    method: "GET",
    path: "/contacts",
    requestInput: (request) => validate(contactPageQuerySchema, request.query),
  }),
  route("list_conversations", {
    method: "GET",
    path: "/inbox",
    requestInput: empty,
  }),
  route("list_messages", {
    method: "GET",
    path: "/inbox/:accountId/:conversationId",
    requestInput: params,
  }),
  route("send_message", {
    method: "POST",
    path: "/inbox/:accountId/:conversationId",
    status: 204,
    requestInput: (request) => ({
      ...(request.body as object),
      ...(request.params as object),
    }),
  }),
]
