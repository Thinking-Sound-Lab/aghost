import { createServerClient } from "@supabase/ssr"
import { createAdminSupabaseClient } from "@workspace/supabase/server"
import type { Database } from "@workspace/supabase/types"
import type { ApiConfig } from "../config"

/**
 * Signs a disposable user in without Google: a one-time link from the admin
 * API becomes the session cookies the API reads.
 *
 * @param cookies Receives the session cookies by name.
 */
export async function signInDisposableUser(
  config: ApiConfig,
  email: string,
  cookies: Map<string, string>
) {
  const admin = createAdminSupabaseClient(config.supabase)
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email })
  if (link.error) throw new Error("Could not create a one-time sign-in link")
  const client = createServerClient<Database>(
    config.supabase.url,
    config.supabase.publishableKey,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (changes) => {
          for (const { name, value } of changes) {
            if (value) cookies.set(name, value)
            else cookies.delete(name)
          }
        },
      },
    }
  )
  const { data, error } = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "magiclink",
  })
  if (error || !data.session)
    throw new Error("Could not sign the disposable user in")
  return data.session
}
