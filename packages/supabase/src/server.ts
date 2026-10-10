import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "./database.types"

export type DatabaseClient = SupabaseClient<Database>

// Server clients are created per request and hold no session of their own.
const STATELESS_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const

/**
 * Client that acts as the signed-in user: every query runs under that user's
 * row level security policies.
 */
export function createUserSupabaseClient(
  config: { url: string; publishableKey: string },
  accessToken: string
): DatabaseClient {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: STATELESS_AUTH,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/**
 * Client that bypasses row level security. It must only ever be created on the
 * server, and callers are responsible for scoping every query themselves.
 */
export function createAdminSupabaseClient(config: {
  url: string
  secretKey: string
}): DatabaseClient {
  return createClient<Database>(config.url, config.secretKey, {
    auth: STATELESS_AUTH,
  })
}
