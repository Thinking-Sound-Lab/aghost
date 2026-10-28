import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

const env = parseEnv(readFileSync(new URL("../.env", import.meta.url), "utf8"))
const appOrigin = new URL(env.APP_URL).origin
const supabaseOrigin = new URL(env.SUPABASE_URL).origin
for (const origin of [appOrigin, supabaseOrigin]) {
  assert(
    ["localhost", "127.0.0.1"].includes(new URL(origin).hostname),
    "This script only verifies local services."
  )
}

function request(path) {
  return fetch(`${appOrigin}${path}`, { redirect: "manual" })
}

assert.equal(
  (await request("/api/health")).status,
  200,
  "API proxy must be healthy"
)
for (const path of [
  "/",
  "/login",
  "/pricing",
  "/home",
  "/automations",
  "/automations/new",
  "/inbox",
  "/settings",
]) {
  const response = await request(path)
  assert.equal(response.status, 200, `Page ${path} must render`)
  assert.match(response.headers.get("Content-Type"), /text\/html/)
  await response.text()
}
for (const path of ["/api/auth/session", "/api/workspace"]) {
  assert.equal((await request(path)).status, 401, `${path} must need sign-in`)
}
console.log("PASS: application pages and the Next.js API proxy")

const started = await request("/api/auth/google")
assert.equal(started.status, 302, "Starting Google sign-in must redirect")
const cookies = started.headers.getSetCookie()
assert(
  cookies.length > 0 && cookies.every((value) => /HttpOnly/i.test(value)),
  "The PKCE cookie must stay HttpOnly through the proxy"
)
const google = new URL(started.headers.get("Location"))
assert.equal(
  google.origin,
  "https://accounts.google.com",
  "Supabase must send the browser to Google. Run pnpm local:logs for its answer."
)
assert.equal(
  google.searchParams.get("client_id"),
  env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID,
  "Supabase must use the Google client in the root .env. Run pnpm local:stop, then pnpm local:start."
)
assert.equal(
  google.searchParams.get("redirect_uri"),
  `${supabaseOrigin}/auth/v1/callback`
)
const refused = await request("/api/auth/callback?error=access_denied")
assert.equal(refused.status, 302)
assert.equal(
  refused.headers.get("Location"),
  `${appOrigin}/login?error=google`,
  "A sign-in that did not finish must return to the login page"
)
console.log(
  "PASS: Google sign-in start, HttpOnly PKCE cookie, and the failed sign-in redirect"
)
