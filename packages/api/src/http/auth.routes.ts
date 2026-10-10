import { Hono } from "hono"
import type { ApiConfig } from "../config"
import {
  credentialsSchema,
  emailSchema,
  passwordSchema,
} from "../contract/auth"
import { BadRequestError, UnauthenticatedError } from "../shared/errors"
import type { HttpEnv } from "./context"
import { presentUser } from "./presenters"
import { readJson, validate } from "./validation"

export function authRoutes(config: ApiConfig) {
  const router = new Hono<HttpEnv>()
  router.get("/session", async (c) => {
    const { data, error } = await c.get("session").auth.getUser()
    if (error || !data.user) throw new UnauthenticatedError()
    return c.json({ user: presentUser(data.user) })
  })
  router.post("/sign-in", async (c) => {
    const input = validate(credentialsSchema, await readJson(c.req))
    const { data, error } = await c
      .get("session")
      .auth.signInWithPassword(input)
    if (error)
      throw new BadRequestError(
        "Email or password is incorrect, or your email needs confirmation."
      )
    return c.json({ user: presentUser(data.user) })
  })
  router.post("/sign-up", async (c) => {
    const input = validate(credentialsSchema, await readJson(c.req))
    const { data, error } = await c.get("session").auth.signUp({
      ...input,
      options: {
        emailRedirectTo: new URL(
          "/api/auth/callback",
          config.appUrl
        ).toString(),
      },
    })
    if (error) throw new BadRequestError(error.message)
    return c.json(
      {
        user: data.session && data.user ? presentUser(data.user) : null,
        needsConfirmation: !data.session,
      },
      201
    )
  })
  router.post("/sign-out", async (c) => {
    const { error } = await c.get("session").auth.signOut()
    if (error) throw new BadRequestError("Could not sign out. Try again.")
    return c.body(null, 204)
  })
  router.post("/password-reset", async (c) => {
    const { email } = validate(emailSchema, await readJson(c.req))
    const { error } = await c.get("session").auth.resetPasswordForEmail(email, {
      redirectTo: new URL(
        "/api/auth/callback?flow=recovery",
        config.appUrl
      ).toString(),
    })
    if (error)
      throw new BadRequestError("Could not send the reset email. Try again.")
    return c.body(null, 204)
  })
  router.post("/password", async (c) => {
    const { data } = await c.get("session").auth.getUser()
    if (!data.user) throw new UnauthenticatedError()
    const input = validate(passwordSchema, await readJson(c.req))
    const { error } = await c.get("session").auth.updateUser(input)
    if (error) throw new BadRequestError(error.message)
    return c.body(null, 204)
  })
  router.get("/callback", async (c) => {
    const code = c.req.query("code")
    if (!code)
      return c.redirect(
        new URL("/login?error=confirmation", config.appUrl).toString()
      )
    const { error } = await c.get("session").auth.exchangeCodeForSession(code)
    const destination = error
      ? "/login?error=confirmation"
      : c.req.query("flow") === "recovery"
        ? "/reset-password"
        : "/home"
    return c.redirect(new URL(destination, config.appUrl).toString())
  })
  return router
}
