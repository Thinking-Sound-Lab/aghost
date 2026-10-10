import type { FastifyRequest, HTTPMethods } from "fastify"
import { activityPageQuerySchema } from "../contract/automation"
import { contactPageQuerySchema } from "../contract/contact"
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
