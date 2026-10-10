import { createServerClient } from "@supabase/ssr"
import type { FastifyReply, FastifyRequest } from "fastify"
import type { Database } from "@workspace/supabase/types"
import type { ApiConfig } from "../../config"

/** Sessions are owned by the API. Tokens never reach JavaScript in the browser. */
export function createSessionClient(
  request: FastifyRequest,
  reply: FastifyReply,
  config: ApiConfig
) {
  return createServerClient<Database>(
    config.supabase.url,
    config.supabase.publishableKey,
    {
      cookieOptions: {
        httpOnly: true,
        secure: new URL(config.appUrl).protocol === "https:",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () =>
          Object.entries(request.cookies).flatMap(([name, value]) =>
            value === undefined ? [] : [{ name, value }]
          ),
        setAll: (cookies, headers) => {
          for (const { name, value, options } of cookies) {
            reply.setCookie(name, value, {
              ...options,
              sameSite: "lax",
              httpOnly: true,
              secure: new URL(config.appUrl).protocol === "https:",
            })
          }
          for (const [name, value] of Object.entries(headers))
            reply.header(name, value)
        },
      },
    }
  )
}
