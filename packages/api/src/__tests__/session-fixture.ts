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

/**
 * Gives the workspace an active plan, as a completed checkout would. Each
 * workspace gets its own made-up Dodo ids.
 */
export async function grantPlan(
  config: ApiConfig,
  workspaceId: string,
  plan: "pro" | "growth" | "business"
) {
  const admin = createAdminSupabaseClient(config.supabase)
  const now = new Date()
  const { error } = await admin.from("workspace_billing").upsert({
    workspace_id: workspaceId,
    dodo_customer_id: `cus_fixture_${workspaceId}`,
    dodo_subscription_id: `sub_fixture_${workspaceId}`,
    plan,
    billing_interval: "monthly",
    status: "active",
    currency: "USD",
    current_period_end: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
    cancel_at_period_end: false,
    subscription_created_at: now.toISOString(),
  })
  if (error) throw new Error(`Could not grant the plan: ${error.message}`)
}
