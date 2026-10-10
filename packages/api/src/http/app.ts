import { Hono } from "hono"
import { logger } from "hono/logger"
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
import type { Authenticate, HttpEnv } from "./context"
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

export function createApp({
  authenticate,
  webhooks,
  config,
}: {
  authenticate: Authenticate
  webhooks: WebhookService
  config: ApiConfig
}) {
  const app = new Hono<HttpEnv>().basePath("/api")
  app.onError((error, c) => {
    if (error instanceof AppError) {
      if (error.code === "internal_error") console.error(error)
      return c.json(
        {
          error: {
            code: error.code,
            message:
              error.code === "internal_error"
                ? "The request could not be completed. Try again."
                : error.message,
            ...(error.fields && { fields: error.fields }),
          },
        },
        statusByCode[error.code]
      )
    }
    console.error(error)
    return c.json(
      {
        error: {
          code: "internal_error",
          message: "The request could not be completed. Try again.",
        },
      },
      500
    )
  })
  app.notFound((c) =>
    c.json(
      { error: { code: "not_found", message: "This endpoint was not found." } },
      404
    )
  )
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "private, no-store")
    c.header("X-Content-Type-Options", "nosniff")
    const method = c.req.method
    if (
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      c.req.path !== "/api/webhooks/zernio"
    ) {
      if (c.req.header("origin") !== new URL(config.appUrl).origin)
        throw new BadRequestError("Request origin is not allowed.")
      if (
        method !== "DELETE" &&
        !c.req.header("content-type")?.includes("application/json")
      )
        throw new BadRequestError(
          "Send JSON with Content-Type: application/json."
        )
    }
    await next()
  })
  app.get("/health", (c) => c.json({ status: "ok" }))
  // Each delivery and its status code, including rejected signatures.
  app.use("/webhooks/*", logger())
  app.post("/webhooks/zernio", async (c) => {
    if (!config.zernio.webhookSecret) throw new IntegrationNotConfiguredError()
    const receipt = await webhooks.receive(
      await c.req.text(),
      c.req.header("x-zernio-signature")
    )
    return c.json({ receipt })
  })
  app.use("/auth/*", async (c, next) => {
    c.set("session", createSessionClient(c, config))
    await next()
  })
  app.route("/auth", authRoutes(config))

  const protectedRoutes = new Hono<HttpEnv>()
  protectedRoutes.use("*", async (c, next) => {
    const session = createSessionClient(c, config)
    const { data, error } = await session.auth.getUser()
    if (error || !data.user) throw new UnauthenticatedError()
    const { data: tokens } = await session.auth.getSession()
    if (!tokens.session) throw new UnauthenticatedError()
    c.set("identity", await authenticate(tokens.session.access_token))
    c.set("session", session)
    await next()
  })
  protectedRoutes.get("/workspace", (c) =>
    c.json(presentWorkspace(c.get("identity").workspace))
  )
  protectedRoutes.patch("/workspace", async (c) => {
    const { services, workspace } = c.get("identity")
    const input = validate(renameWorkspaceSchema, await readJson(c.req))
    return c.json(
      presentWorkspace(await services.workspaces.rename(workspace, input.name))
    )
  })
  protectedRoutes.get("/integrations", (c) =>
    c.json({ instagramConfigured: Boolean(config.zernio.apiKey) })
  )
  protectedRoutes.get("/accounts", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json((await services.accounts.list(workspace)).map(presentAccount))
  })
  protectedRoutes.post("/accounts/connect", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json({
      authUrl: await services.accounts.startConnection(workspace),
    })
  })
  protectedRoutes.post("/accounts/sync", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json((await services.accounts.sync(workspace)).map(presentAccount))
  })
  protectedRoutes.get("/accounts/:id/posts", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json(
      await services.accounts.listRecentPosts(
        workspace,
        validate(z.uuid(), c.req.param("id"))
      )
    )
  })
  protectedRoutes.delete("/accounts/:id", async (c) => {
    const { services, workspace } = c.get("identity")
    await services.accounts.remove(
      workspace,
      validate(z.uuid(), c.req.param("id"))
    )
    return c.body(null, 204)
  })
  protectedRoutes.get("/automations", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json(
      (await services.automations.list(workspace)).map(presentAutomation)
    )
  })
  protectedRoutes.get("/automations/stats", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json(await services.automations.listStats(workspace))
  })
  protectedRoutes.post("/automations", async (c) => {
    const { services, workspace } = c.get("identity")
    const input = validate(createAutomationSchema, await readJson(c.req))
    return c.json(
      presentAutomation(await services.automations.create(workspace, input)),
      201
    )
  })
  protectedRoutes.get("/automations/:id", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json(
      presentAutomation(
        await services.automations.get(
          workspace,
          validate(z.uuid(), c.req.param("id"))
        )
      )
    )
  })
  protectedRoutes.patch("/automations/:id", async (c) => {
    const { services, workspace } = c.get("identity")
    const input = validate(updateAutomationSchema, await readJson(c.req))
    return c.json(
      presentAutomation(
        await services.automations.update(
          workspace,
          validate(z.uuid(), c.req.param("id")),
          input
        )
      )
    )
  })
  protectedRoutes.patch("/automations/:id/status", async (c) => {
    const { services, workspace } = c.get("identity")
    const { status } = validate(
      setAutomationStatusSchema,
      await readJson(c.req)
    )
    return c.json(
      presentAutomation(
        await services.automations.setStatus(
          workspace,
          validate(z.uuid(), c.req.param("id")),
          status
        )
      )
    )
  })
  protectedRoutes.delete("/automations/:id", async (c) => {
    const { services, workspace } = c.get("identity")
    await services.automations.delete(
      workspace,
      validate(z.uuid(), c.req.param("id"))
    )
    return c.body(null, 204)
  })
  protectedRoutes.get("/automations/:id/activity", async (c) => {
    const { services, workspace } = c.get("identity")
    const page = validate(activityPageQuerySchema, c.req.query())
    return c.json(
      await services.automations.listActivity(
        workspace,
        validate(z.uuid(), c.req.param("id")),
        page
      )
    )
  })
  protectedRoutes.get("/inbox", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json(await services.inbox.listConversations(workspace))
  })
  protectedRoutes.get("/inbox/:accountId/:conversationId", async (c) => {
    const { services, workspace } = c.get("identity")
    return c.json(
      await services.inbox.listMessages(
        workspace,
        validate(z.uuid(), c.req.param("accountId")),
        c.req.param("conversationId")
      )
    )
  })
  protectedRoutes.post("/inbox/:accountId/:conversationId", async (c) => {
    const { services, workspace } = c.get("identity")
    const { text } = validate(sendMessageSchema, await readJson(c.req))
    await services.inbox.sendMessage(
      workspace,
      validate(z.uuid(), c.req.param("accountId")),
      c.req.param("conversationId"),
      text
    )
    return c.body(null, 204)
  })
  protectedRoutes.get("/contacts", async (c) => {
    const { services, workspace } = c.get("identity")
    const query = validate(contactPageQuerySchema, c.req.query())
    return c.json(await services.contacts.list(workspace, query))
  })
  app.route("/", protectedRoutes)
  return app
}

export type ApiApp = ReturnType<typeof createApp>
