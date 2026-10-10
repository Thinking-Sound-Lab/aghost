import { createServerClient } from "@supabase/ssr"
import { getCookie, setCookie } from "hono/cookie"
import type { Database } from "@workspace/supabase/types"
import type { ApiConfig } from "../../config"
import type { ApiContext } from "../../http/context"

/** Sessions are owned by the API. Tokens never reach JavaScript in the browser. */
export function createSessionClient(c: ApiContext, config: ApiConfig) {
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
          Object.entries(getCookie(c)).map(([name, value]) => ({
            name,
            value,
          })),
        setAll: (cookies, headers) => {
          for (const { name, value, options } of cookies) {
            setCookie(c, name, value, {
              ...options,
              sameSite: "lax",
              httpOnly: true,
              secure: new URL(config.appUrl).protocol === "https:",
            })
          }
          for (const [name, value] of Object.entries(headers))
            c.header(name, value)
        },
      },
    }
  )
}
