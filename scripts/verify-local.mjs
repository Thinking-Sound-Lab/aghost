import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
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
const mailOrigin = "http://127.0.0.1:54324"
const cookies = new Map()
const email = `aghost-proxy-${randomUUID()}@example.com`
const password = `Fixture-${randomUUID()}`
const newPassword = `Changed-${randomUUID()}`
const mailIds = new Set()
let userId

async function request(path, method = "GET", body) {
  const response = await fetch(`${appOrigin}${path}`, {
    method,
    redirect: "manual",
    headers: {
      origin: appOrigin,
      cookie: [...cookies]
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0]
    const index = pair.indexOf("=")
    const name = pair.slice(0, index)
    if (/Max-Age=0/i.test(cookie)) cookies.delete(name)
    else cookies.set(name, pair.slice(index + 1))
  }
  return response
}

async function adminRequest(path, method, body) {
  return fetch(`${supabaseOrigin}/auth/v1/admin${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
}

async function verify() {
  assert.equal(
    (await request("/api/health")).status,
    200,
    "API proxy must be healthy"
  )
  for (const path of [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/home",
    "/contacts",
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
  console.log("PASS: application pages and the Next.js API proxy")

  const created = await adminRequest("/users", "POST", {
    email,
    password,
    email_confirm: true,
  })
  assert.equal(created.status, 200, "Disposable user must be created")
  userId = (await created.json()).id
  assert(userId, "Disposable user must have an id")
  const signedIn = await request("/api/auth/sign-in", "POST", {
    email,
    password,
  })
  assert.equal(signedIn.status, 200, "Sign-in through the proxy must succeed")
  assert(
    signedIn.headers.getSetCookie().every((value) => /HttpOnly/i.test(value)),
    "Session cookies must stay HttpOnly through the proxy"
  )
  assert(cookies.size > 0, "Proxy must preserve session cookies")
  assert.equal(
    (await (await request("/api/auth/session")).json()).user.id,
    userId
  )
  assert.equal(
    (
      await request("/api/workspace", "PATCH", {
        name: "Proxy verification workspace",
      })
    ).status,
    200
  )
  assert.equal(
    (await (await request("/api/workspace")).json()).name,
    "Proxy verification workspace"
  )
  await request("/api/auth/sign-out", "POST", {})
  assert.equal((await request("/api/auth/session")).status, 401)
  console.log(
    "PASS: HttpOnly authentication, workspace persistence, and sign-out"
  )

  assert.equal(
    (await request("/api/auth/password-reset", "POST", { email })).status,
    204,
    "Password reset email must be accepted"
  )
  const search = await fetch(
    `${mailOrigin}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`
  )
  assert.equal(search.status, 200, "Local mailbox search must succeed")
  const mailbox = await search.json()
  const entries = mailbox.messages.filter((message) =>
    message.To.some((recipient) => recipient.Address === email)
  )
  assert(
    entries.length > 0,
    "Recovery email must arrive in the disposable user's mailbox"
  )
  for (const entry of entries) mailIds.add(entry.ID)
  const message = await (
    await fetch(`${mailOrigin}/api/v1/message/${entries[0].ID}`)
  ).json()
  const href = message.HTML.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&")
  const verificationUrl = new URL(href)
  assert.equal(
    verificationUrl.origin,
    supabaseOrigin,
    "Recovery link must target local Supabase"
  )
  assert.equal(verificationUrl.pathname, "/auth/v1/verify")
  const verified = await fetch(verificationUrl, { redirect: "manual" })
  assert.equal(
    verified.status,
    303,
    "Recovery link must redirect to the app callback"
  )
  const callbackUrl = new URL(verified.headers.get("Location"))
  assert.equal(
    callbackUrl.origin,
    appOrigin,
    "Auth redirects must use the running app origin"
  )
  assert.equal(callbackUrl.pathname, "/api/auth/callback")
  assert.equal(callbackUrl.searchParams.get("flow"), "recovery")
  assert(
    callbackUrl.searchParams.has("code"),
    "Recovery callback must contain a PKCE code"
  )
  const callback = await request(`${callbackUrl.pathname}${callbackUrl.search}`)
  assert.equal(callback.status, 302)
  assert.equal(
    new URL(callback.headers.get("Location")).pathname,
    "/reset-password"
  )
  assert.equal(
    (await request("/api/auth/password", "POST", { password: newPassword }))
      .status,
    204
  )
  await request("/api/auth/sign-out", "POST", {})
  assert.equal(
    (
      await request("/api/auth/sign-in", "POST", {
        email,
        password: newPassword,
      })
    ).status,
    200
  )
  console.log(
    "PASS: email recovery, PKCE callback, and sign-in with the changed password"
  )
}

try {
  await verify()
} finally {
  const cleanupErrors = []
  if (userId) {
    const response = await adminRequest(`/users/${userId}`, "DELETE")
    if (!response.ok) cleanupErrors.push("disposable user")
  }
  // Mailpit deletes every message if IDs is empty: never issue an empty request.
  if (mailIds.size) {
    const response = await fetch(`${mailOrigin}/api/v1/messages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ IDs: [...mailIds] }),
    })
    if (!response.ok) cleanupErrors.push("disposable emails")
  }
  assert.equal(
    cleanupErrors.length,
    0,
    `Cleanup failed: ${cleanupErrors.join(", ")}`
  )
}
