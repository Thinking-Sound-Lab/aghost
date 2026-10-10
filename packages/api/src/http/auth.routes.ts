import type { FastifyPluginAsync } from "fastify"
import type { ApiConfig } from "../config"
import { BadRequestError, UnauthenticatedError } from "../shared/errors"
import { presentUser } from "./presenters"

const SIGN_IN_FAILED_PATH = "/login?error=google"

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
    router.get("/google", async (request, reply) => {
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
      const response = await fetch(data.url, { redirect: "manual" })
      const googleUrl = response.headers.get("location")
      if (!googleUrl) {
        request.log.error(
          { status: response.status, response: await response.text() },
          "Supabase did not start Google sign-in"
        )
        return reply.redirect(appUrl(SIGN_IN_FAILED_PATH))
      }
      return reply.redirect(googleUrl)
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
        // Without a code, the sign-in was cancelled or refused.
        if (!code) return reply.redirect(appUrl(SIGN_IN_FAILED_PATH))
        const { error } =
          await request.session.auth.exchangeCodeForSession(code)
        return reply.redirect(appUrl(error ? SIGN_IN_FAILED_PATH : "/home"))
      }
    )
  }
}
