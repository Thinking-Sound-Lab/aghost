import cookie from "@fastify/cookie"
import Fastify, { LogController } from "fastify"
import { z } from "zod"
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
import { createSessionClient } from "../infrastructure/supabase/session-client"
import type { WebhookService } from "../modules/webhooks/webhook.service"
import {
  AppError,
  BadRequestError,
  IntegrationNotConfiguredError,
  UnauthenticatedError,
} from "../shared/errors"
import { authRoutes } from "./auth.routes"
import type { Authenticate } from "./context"
import {
  presentAccount,
  presentAutomation,
  presentWorkspace,
} from "./presenters"
import { readJson, validate } from "./validation"

const statusByCode = {
  unauthenticated: 401,
  bad_request: 400,
  validation_failed: 422,
  not_found: 404,
  conflict: 409,
  account_disconnected: 409,
  invalid_webhook_signature: 401,
  provider_rate_limited: 429,
  provider_error: 502,
  internal_error: 500,
  integration_not_configured: 503,
} as const

const WEBHOOK_PATH = "/api/webhooks/zernio"

type IdParams = { Params: { id: string } }
type ThreadParams = { Params: { accountId: string; conversationId: string } }

/** Fastify rejects some requests itself, such as a body over its size limit. */
function isRequestError(error: unknown) {
  return (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  )
}

export function createApp({
  authenticate,
  webhooks,
  config,
}: {
  authenticate: Authenticate
  webhooks: WebhookService
  config: ApiConfig
}) {
  const app = Fastify({
    logger: true,
    // Each delivery and its status code, including rejected signatures.
    logController: new LogController({
      disableRequestLogging: (request) =>
        request.routeOptions.url !== WEBHOOK_PATH,
    }),
  })
  app.register(cookie)
  // Bodies stay text: routes parse JSON themselves, and a webhook signature
  // covers the exact bytes that were sent.
  app.removeAllContentTypeParsers()
  app.addContentTypeParser("*", { parseAs: "string" }, (_request, body, done) =>
    done(null, body)
  )
  app.decorateRequest("session")
  app.decorateRequest("identity")
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.code === "internal_error") request.log.error(error)
      return reply.code(statusByCode[error.code]).send({
        error: {
          code: error.code,
          message:
            error.code === "internal_error"
              ? "The request could not be completed. Try again."
              : error.message,
          ...(error.fields && { fields: error.fields }),
        },
      })
    }
    if (isRequestError(error))
      return reply.code(400).send({
        error: {
          code: "bad_request",
          message: "The request could not be read.",
        },
      })
    request.log.error(error)
    return reply.code(500).send({
      error: {
        code: "internal_error",
        message: "The request could not be completed. Try again.",
      },
    })
  })
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({
      error: { code: "not_found", message: "This endpoint was not found." },
    })
  )
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "private, no-store")
    reply.header("X-Content-Type-Options", "nosniff")
    const method = request.method
    if (
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      request.routeOptions.url !== WEBHOOK_PATH
    ) {
      if (request.headers.origin !== new URL(config.appUrl).origin)
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
      api.post<{ Headers: { "x-zernio-signature"?: string } }>(
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
      api.register(
        async (auth) => {
          auth.addHook("onRequest", async (request, reply) => {
            request.session = createSessionClient(request, reply, config)
          })
          auth.register(authRoutes(config))
        },
        { prefix: "/auth" }
      )
      api.register(async (routes) => {
        routes.addHook("onRequest", async (request, reply) => {
          const session = createSessionClient(request, reply, config)
          const { data, error } = await session.auth.getUser()
          if (error || !data.user) throw new UnauthenticatedError()
          const { data: tokens } = await session.auth.getSession()
          if (!tokens.session) throw new UnauthenticatedError()
          request.identity = await authenticate(tokens.session.access_token)
          request.session = session
        })
        routes.get("/workspace", async (request) =>
          presentWorkspace(request.identity.workspace)
        )
        routes.patch("/workspace", async (request) => {
          const { services, workspace } = request.identity
          const input = validate(renameWorkspaceSchema, readJson(request.body))
          return presentWorkspace(
            await services.workspaces.rename(workspace, input.name)
          )
        })
        routes.get("/integrations", async () => ({
          instagramConfigured: Boolean(config.zernio.apiKey),
        }))
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
          const input = validate(createAutomationSchema, readJson(request.body))
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
          const input = validate(updateAutomationSchema, readJson(request.body))
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
          const { status } = validate(
            setAutomationStatusSchema,
            readJson(request.body)
          )
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
            const { text } = validate(sendMessageSchema, readJson(request.body))
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
