import type { FastifyPluginAsync } from "fastify"
import type { ApiConfig } from "../config"
import {
  billingChoice,
  billingLoginPath,
  billingPath,
} from "../contract/billing"
import { BadRequestError, UnauthenticatedError } from "../shared/errors"
import { presentUser } from "./presenters"

const SIGN_IN_FAILED_PATH = "/login?error=google"
const RETURN_COOKIE = "aghost-auth-return"

export function authRoutes(config: ApiConfig): FastifyPluginAsync {
  const appUrl = (path: string) => new URL(path, config.appUrl).toString()
  return async (router) => {
    router.get("/session", async (request) => {
      const { data, error } = await request.session.auth.getUser()
      if (error || !data.user) throw new UnauthenticatedError()
      return { user: presentUser(data.user) }
    })
    // The browser navigates here. Google signs the person in and Supabase
    // sends them back to /callback; a first sign-in creates their account.
    router.get<{
      Querystring: { next?: string; plan?: string; interval?: string }
    }>("/google", async (request, reply) => {
      const billing = request.query.next === "billing"
      const choice = billing ? billingChoice(request.query) : null
      const returnTo = billing
        ? choice
          ? `billing:${choice.plan}:${choice.interval}`
          : "billing"
        : "home"
      reply.setCookie(RETURN_COOKIE, returnTo, {
        path: "/api/auth",
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(config.appUrl).protocol === "https:",
        maxAge: 600,
      })
      const { data, error } = await request.session.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: appUrl("/api/auth/callback"),
          skipBrowserRedirect: true,
          // Someone with several Google accounts chooses one each time.
          queryParams: { prompt: "select_account" },
        },
      })
      if (error) throw error
      // Supabase answers this address with a redirect to Google. Reading it
      // here sends the browser straight to Google, so it never needs the
      // address the API reaches Supabase at, which is private in Docker.
      try {
        const response = await fetch(data.url, { redirect: "manual" })
        const googleUrl = response.headers.get("location")
        if (!googleUrl)
          throw new Error(
            `Supabase answered ${response.status}: ${await response.text()}`
          )
        return reply.redirect(googleUrl)
      } catch (cause) {
        // The browser navigated here, so the login page reports the failure.
        request.log.error(cause, "Could not start Google sign-in")
        return reply.redirect(
          appUrl(
            billing
              ? `${billingLoginPath(choice)}&error=google`
              : SIGN_IN_FAILED_PATH
          )
        )
      }
    })
    router.post("/sign-out", async (request, reply) => {
      const { error } = await request.session.auth.signOut()
      if (error) throw new BadRequestError("Could not sign out. Try again.")
      return reply.code(204).send()
    })
    router.get<{ Querystring: { code?: string } }>(
      "/callback",
      async (request, reply) => {
        const { code } = request.query
        const [next, plan, interval] = (
          request.cookies[RETURN_COOKIE] ?? ""
        ).split(":")
        const choice = billingChoice({ plan, interval })
        const destination = next === "billing" ? billingPath(choice) : "/home"
        const failure =
          next === "billing"
            ? `${billingLoginPath(choice)}&error=google`
            : SIGN_IN_FAILED_PATH
        reply.clearCookie(RETURN_COOKIE, { path: "/api/auth" })
        // Without a code, the sign-in was cancelled or refused.
        if (!code) return reply.redirect(appUrl(failure))
        const { error } =
          await request.session.auth.exchangeCodeForSession(code)
        return reply.redirect(appUrl(error ? failure : destination))
      }
    )
  }
}
