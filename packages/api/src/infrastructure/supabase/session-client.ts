import { createServerClient } from "@supabase/ssr"
import type { FastifyReply, FastifyRequest } from "fastify"
import type { Database } from "@workspace/supabase/types"
import type { ApiConfig } from "../../config"

/**
 * Sessions are owned by the API. Tokens never reach JavaScript in the browser.
 * Returns a function that binds a Supabase client to one request's cookies.
 */
export function createSessionClientFactory(config: ApiConfig) {
  const cookieOptions = {
    httpOnly: true,
    secure: new URL(config.appUrl).protocol === "https:",
    sameSite: "lax",
    path: "/",
  } as const

  return (request: FastifyRequest, reply: FastifyReply) =>
    createServerClient<Database>(
      config.supabase.url,
      config.supabase.publishableKey,
      {
        cookieOptions,
        cookies: {
          getAll: () =>
            Object.entries(request.cookies).flatMap(([name, value]) =>
              value === undefined ? [] : [{ name, value }]
            ),
          setAll: (cookies, headers) => {
            for (const { name, value, options } of cookies) {
              reply.setCookie(name, value, {
                ...options,
                sameSite: cookieOptions.sameSite,
                httpOnly: cookieOptions.httpOnly,
                secure: cookieOptions.secure,
              })
            }
            for (const [name, value] of Object.entries(headers))
              reply.header(name, value)
          },
        },
      }
    )
}
