import cookie from "@fastify/cookie"
import type { User } from "@supabase/supabase-js"
import Fastify, {
  LogController,
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify"
import { z } from "zod"
import { createApiKeySchema } from "../contract/api-key"
import type { ApiConfig } from "../config"
import {
  activityPageQuerySchema,
  createAutomationSchema,
  setAutomationStatusSchema,
  updateAutomationSchema,
} from "../contract/automation"
import { contactPageQuerySchema } from "../contract/contact"
import { sendMessageSchema } from "../contract/inbox"
import { renameWorkspaceSchema } from "../contract/workspace"
import { choosePlanSchema } from "../contract/billing"
import type { ApiErrorBody } from "../contract/errors"
import { createSessionClientFactory } from "../infrastructure/supabase/session-client"
import type { WebhookService } from "../modules/webhooks/webhook.service"
import type { BillingWebhookService } from "../modules/billing/billing-webhook"
import type { Payer } from "../modules/billing/billing.service"
import {
  actorOf,
  type Actor,
  type Analytics,
  type EventSource,
} from "../modules/analytics/analytics"
import {
  AppError,
  BadRequestError,
  BillingNotConfiguredError,
  IntegrationNotConfiguredError,
  UnauthenticatedError,
} from "../shared/errors"
import { authRoutes } from "./auth.routes"
import type { Authenticate, AuthenticateAgent } from "./context"
import { agentRoutes } from "./agent.routes"
import { mcpRoutes } from "../mcp/routes"
import {
  presentAccount,
  presentAutomation,
  presentWorkspace,
} from "./presenters"
import { validate } from "./validation"

const statusByCode = {
  unauthenticated: 401,
  forbidden: 403,
  bad_request: 400,
  validation_failed: 422,
  not_found: 404,
  conflict: 409,
  account_disconnected: 409,
  plan_required: 402,
  plan_limit_reached: 403,
  invalid_webhook_signature: 401,
  provider_rate_limited: 429,
  provider_error: 502,
  internal_error: 500,
  integration_not_configured: 503,
} as const

const WEBHOOK_PATHS = new Set(["/api/webhooks/zernio", "/api/webhooks/dodo"])

// Billing, where a signed-in workspace without a plan chooses one.
const withoutPlan = { config: { withoutPlan: true } }

// Standard Webhooks headers that sign each Dodo Payments delivery.
const DODO_SIGNATURE_HEADERS = [
  "webhook-id",
  "webhook-timestamp",
  "webhook-signature",
] as const

const INTERNAL_ERROR_MESSAGE = "The request could not be completed. Try again."

const rejectionMessages: Record<string, string> = {
  FST_ERR_CTP_EMPTY_JSON_BODY: "Send a valid JSON body.",
  FST_ERR_CTP_INVALID_JSON_BODY: "Send a valid JSON body.",
  FST_ERR_CTP_BODY_TOO_LARGE: "The request body is too large.",
  FST_ERR_BAD_URL: "This address is not valid.",
}

type IdParams = { Params: { id: string } }
type RequestHeaders = FastifyRequest["headers"]

function signatureHeaders(headers: RequestHeaders): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const name of DODO_SIGNATURE_HEADERS) {
    const value = headers[name]
    if (typeof value === "string") picked[name] = value
  }
  return picked
}

/** The person paying, as Google identified them at sign-in. */
function payerOf(user: User): Payer {
  if (!user.email)
    throw new BadRequestError("Your account has no email address to bill.")
  const name: unknown = user.user_metadata.full_name
  return {
    email: user.email,
    name: typeof name === "string" && name.trim() ? name : user.email,
  }
}
type ThreadParams = { Params: { accountId: string; conversationId: string } }

function errorBody(
  code: ApiErrorBody["error"]["code"],
  message: string,
  fields?: Record<string, string>
): ApiErrorBody {
  return { error: { code, message, ...(fields && { fields }) } }
}

/** Fastify refused the request itself, for example its URL or body. */
function isRejection(error: FastifyError): error is FastifyError & {
  statusCode: number
} {
  return (
    error.code?.startsWith("FST_ERR_") === true &&
    error.statusCode !== undefined &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  )
}

function sourceOf(request: FastifyRequest): EventSource {
  const route = request.routeOptions.url ?? ""
  if (WEBHOOK_PATHS.has(route)) return "webhook"
  if (route === "/api/mcp") return "mcp"
  return request.routeOptions.config?.agent ? "api" : "dashboard"
}

/** Who made the request, as far as authentication got before the error. */
function actorOfRequest(request: FastifyRequest): Actor | null {
  const workspace =
    request.identity?.workspace ?? request.agentIdentity?.workspace
  if (workspace) return actorOf(workspace)
  return request.user ? { userId: request.user.id } : null
}

const errorHandler = (analytics: Analytics) =>
  function sendError(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const unexpected = () => {
      request.log.error(error)
      analytics
        .from(sourceOf(request))
        .captureException(error, actorOfRequest(request), {
          method: request.method,
          route: request.routeOptions.url ?? "unmatched",
        })
    }
    if (error instanceof AppError) {
      if (error.code === "internal_error") unexpected()
      return reply
        .code(statusByCode[error.code])
        .send(
          errorBody(
            error.code,
            error.code === "internal_error"
              ? INTERNAL_ERROR_MESSAGE
              : error.message,
            error.fields
          )
        )
    }
    if (isRejection(error)) {
      request.log.warn(error)
      return reply
        .code(error.statusCode)
        .send(
          errorBody(
            "bad_request",
            rejectionMessages[error.code] ?? "The request could not be read."
          )
        )
    }
    unexpected()
    return reply
      .code(500)
      .send(errorBody("internal_error", INTERNAL_ERROR_MESSAGE))
  }

export function createApp({
  authenticate,
  authenticateAgent,
  webhooks,
  billingWebhooks,
  analytics,
  config,
}: {
  authenticate: Authenticate
  authenticateAgent: AuthenticateAgent
  webhooks: WebhookService
  billingWebhooks: BillingWebhookService
  analytics: Analytics
  config: ApiConfig
}) {
  const appOrigin = new URL(config.appUrl).origin
  const sendError = errorHandler(analytics)
  const createSessionClient = createSessionClientFactory(config)
  const app = Fastify({
    logger: { redact: ["req.headers.authorization", "req.headers.cookie"] },
    // Each delivery and its status code, including rejected signatures.
    logController: new LogController({
      disableRequestLogging: (request) =>
        !WEBHOOK_PATHS.has(request.routeOptions.url ?? ""),
    }),
    // Zernio's conversation ids are opaque and can exceed the default of 100.
    routerOptions: { maxParamLength: 1000 },
    // Malformed URLs and oversized parameters, rejected before routing.
    frameworkErrors: sendError,
  })
  analytics.reportFailuresTo((error) =>
    app.log.warn({ err: error }, "PostHog did not receive analytics events")
  )
  // Events still queued are sent before the process stops.
  app.addHook("onClose", () => analytics.shutdown())
  app.register(cookie)
  app.decorateRequest("session")
  app.decorateRequest("identity")
  app.decorateRequest("user")
  app.decorateRequest("agentIdentity")
  app.setErrorHandler(sendError)
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send(errorBody("not_found", "This endpoint was not found."))
  )
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "private, no-store")
    reply.header("X-Content-Type-Options", "nosniff")
    const method = request.method
    const agent = request.routeOptions.config.agent === true
    if (
      agent &&
      request.headers.origin !== undefined &&
      request.headers.origin !== appOrigin
    ) {
      throw new BadRequestError("Request origin is not allowed.")
    }
    if (
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      !WEBHOOK_PATHS.has(request.routeOptions.url ?? "")
    ) {
      if (!agent && request.headers.origin !== appOrigin)
        throw new BadRequestError("Request origin is not allowed.")
      if (
        method !== "DELETE" &&
        !request.headers["content-type"]?.includes("application/json")
      )
        throw new BadRequestError(
          "Send JSON with Content-Type: application/json."
        )
    }
  })
  app.register(
    async (api) => {
      api.get("/health", async () => ({ status: "ok" }))
      api.register(agentRoutes(authenticateAgent), { prefix: "/v1" })
      api.register(mcpRoutes(authenticateAgent, config.appUrl))
      api.register(async (hooks) => {
        // The signature covers the exact bytes sent, so the body stays text.
        hooks.removeAllContentTypeParsers()
        hooks.addContentTypeParser(
          "*",
          { parseAs: "string" },
          (_request, body, done) => done(null, body)
        )
        hooks.post<{ Headers: { "x-zernio-signature"?: string } }>(
          "/webhooks/zernio",
          async (request) => {
            if (!config.zernio.webhookSecret)
              throw new IntegrationNotConfiguredError()
            // A delivery without a body is signed over the empty string.
            const rawBody = typeof request.body === "string" ? request.body : ""
            const receipt = await webhooks.receive(
              rawBody,
              request.headers["x-zernio-signature"]
            )
            return { receipt }
          }
        )
        hooks.post("/webhooks/dodo", async (request) => {
          if (!config.dodo.webhookKey) throw new BillingNotConfiguredError()
          const rawBody = typeof request.body === "string" ? request.body : ""
          const outcome = await billingWebhooks.receive(
            rawBody,
            signatureHeaders(request.headers)
          )
          return { outcome }
        })
      })
      api.register(
        async (auth) => {
          auth.addHook("onRequest", async (request, reply) => {
            request.session = createSessionClient(request, reply)
          })
          auth.register(authRoutes(config, analytics))
        },
        { prefix: "/auth" }
      )
      api.register(async (routes) => {
        routes.addHook("onRequest", async (request, reply) => {
          const session = createSessionClient(request, reply)
          const { data, error } = await session.auth.getUser()
          if (error || !data.user) throw new UnauthenticatedError()
          const { data: tokens } = await session.auth.getSession()
          if (!tokens.session) throw new UnauthenticatedError()
          request.identity = await authenticate(tokens.session.access_token)
          request.session = session
          request.user = data.user
          // The paywall: every other route is the product a plan pays for.
          if (!request.routeOptions.config.withoutPlan)
            await request.identity.services.plans.assertCanUseWorkspace(
              request.identity.workspace
            )
        })
        routes.get("/workspace", async (request) =>
          presentWorkspace(request.identity.workspace)
        )
        routes.get("/api-keys", async (request) => {
          const { services, workspace } = request.identity
          return services.apiKeys.list(workspace)
        })
        routes.post("/api-keys", async (request, reply) => {
          const { services, workspace } = request.identity
          return reply
            .code(201)
            .send(
              await services.apiKeys.create(
                workspace,
                validate(createApiKeySchema, request.body)
              )
            )
        })
        routes.delete<IdParams>("/api-keys/:id", async (request, reply) => {
          const { services, workspace } = request.identity
          await services.apiKeys.revoke(
            workspace,
            validate(z.uuid(), request.params.id)
          )
          return reply.code(204).send()
        })
        routes.patch("/workspace", async (request) => {
          const { services, workspace } = request.identity
          const input = validate(renameWorkspaceSchema, request.body)
          return presentWorkspace(
            await services.workspaces.rename(workspace, input.name)
          )
        })
        routes.get("/integrations", withoutPlan, async () => ({
          instagramConfigured: Boolean(config.zernio.apiKey),
          billingConfigured: Boolean(config.dodo.apiKey),
        }))
        routes.get("/billing", withoutPlan, async (request) => {
          const { services, workspace } = request.identity
          return services.billing.getState(workspace)
        })
        routes.post("/billing/sync", withoutPlan, async (request) => {
          const { services, workspace } = request.identity
          return services.billing.sync(workspace)
        })
        routes.post("/billing/checkout", withoutPlan, async (request) => {
          const { services, workspace } = request.identity
          return {
            url: await services.billing.startCheckout(
              workspace,
              payerOf(request.user),
              validate(choosePlanSchema, request.body)
            ),
          }
        })
        routes.post("/billing/plan", withoutPlan, async (request) => {
          const { services, workspace } = request.identity
          return services.billing.changePlan(
            workspace,
            validate(choosePlanSchema, request.body)
          )
        })
        routes.post("/billing/portal", withoutPlan, async (request) => {
          const { services, workspace } = request.identity
          return { url: await services.billing.openPortal(workspace) }
        })
        routes.get("/accounts", async (request) => {
          const { services, workspace } = request.identity
          return (await services.accounts.list(workspace)).map(presentAccount)
        })
        routes.post("/accounts/connect", async (request) => {
          const { services, workspace } = request.identity
          return {
            authUrl: await services.accounts.startConnection(workspace),
          }
        })
        routes.post("/accounts/sync", async (request) => {
          const { services, workspace } = request.identity
          return (await services.accounts.sync(workspace)).map(presentAccount)
        })
        routes.get<IdParams>("/accounts/:id/posts", async (request) => {
          const { services, workspace } = request.identity
          return services.accounts.listRecentPosts(
            workspace,
            validate(z.uuid(), request.params.id)
          )
        })
        routes.delete<IdParams>("/accounts/:id", async (request, reply) => {
          const { services, workspace } = request.identity
          await services.accounts.remove(
            workspace,
            validate(z.uuid(), request.params.id)
          )
          return reply.code(204).send()
        })
        routes.get("/automations", async (request) => {
          const { services, workspace } = request.identity
          return (await services.automations.list(workspace)).map(
            presentAutomation
          )
        })
        routes.get("/automations/stats", async (request) => {
          const { services, workspace } = request.identity
          return services.automations.listStats(workspace)
        })
        routes.post("/automations", async (request, reply) => {
          const { services, workspace } = request.identity
          const input = validate(createAutomationSchema, request.body)
          return reply
            .code(201)
            .send(
              presentAutomation(
                await services.automations.create(workspace, input)
              )
            )
        })
        routes.get<IdParams>("/automations/:id", async (request) => {
          const { services, workspace } = request.identity
          return presentAutomation(
            await services.automations.get(
              workspace,
              validate(z.uuid(), request.params.id)
            )
          )
        })
        routes.patch<IdParams>("/automations/:id", async (request) => {
          const { services, workspace } = request.identity
          const input = validate(updateAutomationSchema, request.body)
          return presentAutomation(
            await services.automations.update(
              workspace,
              validate(z.uuid(), request.params.id),
              input
            )
          )
        })
        routes.patch<IdParams>("/automations/:id/status", async (request) => {
          const { services, workspace } = request.identity
          const { status } = validate(setAutomationStatusSchema, request.body)
          return presentAutomation(
            await services.automations.setStatus(
              workspace,
              validate(z.uuid(), request.params.id),
              status
            )
          )
        })
        routes.delete<IdParams>("/automations/:id", async (request, reply) => {
          const { services, workspace } = request.identity
          await services.automations.delete(
            workspace,
            validate(z.uuid(), request.params.id)
          )
          return reply.code(204).send()
        })
        routes.get<IdParams>("/automations/:id/activity", async (request) => {
          const { services, workspace } = request.identity
          const page = validate(activityPageQuerySchema, request.query)
          return services.automations.listActivity(
            workspace,
            validate(z.uuid(), request.params.id),
            page
          )
        })
        routes.get("/inbox", async (request) => {
          const { services, workspace } = request.identity
          return services.inbox.listConversations(workspace)
        })
        routes.get<ThreadParams>(
          "/inbox/:accountId/:conversationId",
          async (request) => {
            const { services, workspace } = request.identity
            return services.inbox.listMessages(
              workspace,
              validate(z.uuid(), request.params.accountId),
              request.params.conversationId
            )
          }
        )
        routes.post<ThreadParams>(
          "/inbox/:accountId/:conversationId",
          async (request, reply) => {
            const { services, workspace } = request.identity
            const { text } = validate(sendMessageSchema, request.body)
            await services.inbox.sendMessage(
              workspace,
              validate(z.uuid(), request.params.accountId),
              request.params.conversationId,
              text
            )
            return reply.code(204).send()
          }
        )
        routes.get("/contacts", async (request) => {
          const { services, workspace } = request.identity
          const query = validate(contactPageQuerySchema, request.query)
          return services.contacts.list(workspace, query)
        })
      })
    },
    { prefix: "/api" }
  )
  return app
}

export type ApiApp = ReturnType<typeof createApp>
