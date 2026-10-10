import type { FastifyPluginAsync } from "fastify"
import type { ApiConfig } from "../config"
import {
  credentialsSchema,
  emailSchema,
  passwordSchema,
} from "../contract/auth"
import { BadRequestError, UnauthenticatedError } from "../shared/errors"
import { presentUser } from "./presenters"
import { validate } from "./validation"

export function authRoutes(config: ApiConfig): FastifyPluginAsync {
  return async (router) => {
    router.get("/session", async (request) => {
      const { data, error } = await request.session.auth.getUser()
      if (error || !data.user) throw new UnauthenticatedError()
      return { user: presentUser(data.user) }
    })
    router.post("/sign-in", async (request) => {
      const input = validate(credentialsSchema, request.body)
      const { data, error } =
        await request.session.auth.signInWithPassword(input)
      if (error)
        throw new BadRequestError(
          "Email or password is incorrect, or your email needs confirmation."
        )
      return { user: presentUser(data.user) }
    })
    router.post("/sign-up", async (request, reply) => {
      const input = validate(credentialsSchema, request.body)
      const { data, error } = await request.session.auth.signUp({
        ...input,
        options: {
          emailRedirectTo: new URL(
            "/api/auth/callback",
            config.appUrl
          ).toString(),
        },
      })
      if (error) throw new BadRequestError(error.message)
      return reply.code(201).send({
        user: data.session && data.user ? presentUser(data.user) : null,
        needsConfirmation: !data.session,
      })
    })
    router.post("/sign-out", async (request, reply) => {
      const { error } = await request.session.auth.signOut()
      if (error) throw new BadRequestError("Could not sign out. Try again.")
      return reply.code(204).send()
    })
    router.post("/password-reset", async (request, reply) => {
      const { email } = validate(emailSchema, request.body)
      const { error } = await request.session.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: new URL(
            "/api/auth/callback?flow=recovery",
            config.appUrl
          ).toString(),
        }
      )
      if (error)
        throw new BadRequestError("Could not send the reset email. Try again.")
      return reply.code(204).send()
    })
    router.post("/password", async (request, reply) => {
      const { data } = await request.session.auth.getUser()
      if (!data.user) throw new UnauthenticatedError()
      const input = validate(passwordSchema, request.body)
      const { error } = await request.session.auth.updateUser(input)
      if (error) throw new BadRequestError(error.message)
      return reply.code(204).send()
    })
    router.get<{ Querystring: { code?: string; flow?: string } }>(
      "/callback",
      async (request, reply) => {
        const { code, flow } = request.query
        if (!code)
          return reply.redirect(
            new URL("/login?error=confirmation", config.appUrl).toString()
          )
        const { error } =
          await request.session.auth.exchangeCodeForSession(code)
        const destination = error
          ? "/login?error=confirmation"
          : flow === "recovery"
            ? "/reset-password"
            : "/home"
        return reply.redirect(new URL(destination, config.appUrl).toString())
      }
    )
  }
}
