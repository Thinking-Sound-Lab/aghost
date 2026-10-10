import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ensureRootEnv, fillRootEnv } from "./local-env.mjs"
import { run } from "./local-command.mjs"
import { compose } from "./local-compose.mjs"

/**
 * Starts Supabase, applies pending migrations, and fills its keys into the
 * root .env. Returns the configured values.
 *
 * @param exclude Supabase containers not to start.
 */
export async function startSupabase(exclude = []) {
  const env = ensureRootEnv()
  console.log("Starting this project's Supabase Docker containers...")
  const options = exclude.length ? ["--exclude", exclude.join(",")] : []
  // Supabase start/status report credentials on stdout. Keep that output private.
  await run("pnpm", ["exec", "supabase", "start", ...options], { quiet: true })
  await run("pnpm", ["exec", "supabase", "migration", "up", "--local"])
  const status = JSON.parse(
    await run("pnpm", ["exec", "supabase", "status", "--output", "json"], {
      capture: true,
    })
  )
  if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY)
    throw new Error("Supabase did not report all required local credentials.")
  if (new URL(env.SUPABASE_URL).origin !== new URL(status.API_URL).origin)
    throw new Error(
      "SUPABASE_URL in the root .env must match this project's local Supabase API address."
    )
  return fillRootEnv({
    SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
    SUPABASE_SECRET_KEY: status.SERVICE_ROLE_KEY,
  })
}

export async function setupLocal() {
  const configured = await startSupabase()
  console.log("Starting the API Docker container...")
  await compose(
    ["up", "--detach", "--build", "--wait", "--wait-timeout", "120"],
    configured
  )
  console.log("Docker API and Supabase are ready. Configuration: root .env.")
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await setupLocal()
  console.log("Run pnpm dev to start the web app.")
}
