import { randomBytes } from "node:crypto"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { ensureRootEnv, fillRootEnv, readRootEnv } from "./local-env.mjs"
import { compose } from "./local-compose.mjs"
import { setupLocal } from "./setup-local.mjs"
import { run } from "./local-command.mjs"

// One subscription per Zernio account; each run points it at the new address.
const WEBHOOK_NAME = "aghost local tunnel"
const WEBHOOK_EVENTS = [
  "account.connected",
  "account.disconnected",
  "message.sent",
  "message.received",
]

const configured = ensureRootEnv()
if (!configured.ZERNIO_API_KEY && !configured.DODO_PAYMENTS_API_KEY)
  throw new Error(
    "Add ZERNIO_API_KEY or DODO_PAYMENTS_API_KEY to the root .env. The tunnel registers webhook endpoints with the configured providers."
  )
if (
  configured.DODO_PAYMENTS_API_KEY &&
  configured.DODO_PAYMENTS_ENVIRONMENT !== "test_mode"
)
  throw new Error(
    "Local Dodo webhooks require test_mode. Configure the live webhook against your deployed API."
  )
// Written before setup so the API container starts with the same secret.
if (configured.ZERNIO_API_KEY)
  fillRootEnv({ ZERNIO_WEBHOOK_SECRET: randomBytes(32).toString("hex") })
await setupLocal()
const env = readRootEnv()

console.log("Starting the Cloudflare quick tunnel...")
await compose(
  [
    "--profile",
    "tunnel",
    "up",
    "--detach",
    "--wait",
    "--wait-timeout",
    "120",
    "tunnel",
  ],
  env
)
const metrics = (
  await compose(["port", "tunnel", "2000"], env, { capture: true })
).trim()
const { hostname } = await (await fetch(`http://${metrics}/quicktunnel`)).json()
if (!hostname)
  throw new Error("cloudflared did not report its trycloudflare.com address.")
const url = `https://${hostname}/api/webhooks/zernio`

async function zernio(method, path, body) {
  const response = await fetch(new URL(`${env.ZERNIO_API_URL}${path}`), {
    method,
    headers: {
      Authorization: `Bearer ${env.ZERNIO_API_KEY}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  if (!response.ok)
    throw new Error(
      `Zernio ${method} ${path} failed with ${response.status}: ${text}`
    )
  return JSON.parse(text)
}

if (env.ZERNIO_API_KEY) {
  const { webhooks } = await zernio("GET", "/v1/webhooks/settings")
  if (!Array.isArray(webhooks))
    throw new Error("Zernio returned an unexpected webhook list.")
  const existing = webhooks.find((webhook) => webhook.name === WEBHOOK_NAME)
  const settings = {
    name: WEBHOOK_NAME,
    url,
    secret: env.ZERNIO_WEBHOOK_SECRET,
    events: WEBHOOK_EVENTS,
    isActive: true,
  }
  const { webhook } = existing
    ? await zernio("PUT", "/v1/webhooks/settings", {
        webhookId: existing._id,
        ...settings,
      })
    : await zernio("POST", "/v1/webhooks/settings", settings)
  if (!webhook?._id)
    throw new Error("Zernio did not return the registered webhook.")

  const test = await zernio("POST", "/v1/webhooks/test", {
    webhookId: webhook._id,
  })
  if (!test.success)
    throw new Error(`Zernio could not deliver a test event: ${test.message}`)

  console.log(`
Zernio webhook "${WEBHOOK_NAME}" now delivers to:
  ${url}

Only this path is public. Zernio accepted a test event; watch deliveries with
pnpm local:logs. pnpm local:stop stops the tunnel with the rest of the stack.`)
}

if (env.DODO_PAYMENTS_API_KEY) {
  const require = createRequire(
    new URL("../apps/server/package.json", import.meta.url)
  )
  await run(process.execPath, [
    "--import",
    require.resolve("tsx"),
    fileURLToPath(new URL("./billing-webhook.mts", import.meta.url)),
    `https://${hostname}/api/webhooks/dodo`,
  ])
  // The registration wrote the signing secret; recreate the API with it.
  await compose(
    ["up", "--detach", "--wait", "--wait-timeout", "120", "server"],
    readRootEnv()
  )
}
