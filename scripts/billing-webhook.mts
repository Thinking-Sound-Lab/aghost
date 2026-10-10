// Explicit ESM keeps top-level await working with the root package's loader.
import { ensureRootEnv, writeRootEnv } from "./local-env.mjs"
import { loadApiConfig } from "../packages/api/src/config"
import {
  createDodoClient,
  request,
} from "../packages/api/src/infrastructure/dodo/dodo-client"

const config = loadApiConfig(ensureRootEnv())
if (config.dodo.environment !== "test_mode")
  throw new Error("Local webhooks require Dodo test_mode.")
const url = new URL(process.argv[2] ?? "")
if (
  url.protocol !== "https:" ||
  !url.hostname.endsWith(".trycloudflare.com") ||
  url.pathname !== "/api/webhooks/dodo"
)
  throw new Error("Expected the local Cloudflare tunnel's Dodo webhook URL.")
const client = createDodoClient(config.dodo)
const name = "aghost local tunnel"
const found = await request("find the local billing webhook", async () => {
  const matches = []
  for await (const webhook of client.webhooks.list())
    if (
      webhook.description === name &&
      webhook.metadata.aghost_environment === "local"
    )
      matches.push(webhook)
  return matches
})
if (found.length > 1)
  throw new Error(
    "Several local billing webhooks exist. Keep one in the Dodo dashboard, then retry."
  )
const settings = {
  url: url.toString(),
  description: name,
  disabled: false,
  metadata: { aghost_environment: "local" },
  filter_types: [
    "subscription.active",
    "subscription.plan_changed",
    "subscription.renewed",
    "subscription.updated",
    "subscription.past_due",
    "subscription.on_hold",
    "subscription.paused",
    "subscription.unpaused",
    "subscription.cancelled",
    "subscription.failed",
    "subscription.expired",
    "payment.succeeded",
    "payment.failed",
    "payment.cancelled",
    "payment.processing",
  ] as const,
}
const webhook = await request("register the local billing webhook", () =>
  found[0]
    ? client.webhooks.update(found[0].id, {
        ...settings,
        filter_types: [...settings.filter_types],
      })
    : client.webhooks.create({
        ...settings,
        filter_types: [...settings.filter_types],
      })
)
const { secret } = await request(
  "load the billing webhook signing secret",
  () => client.webhooks.retrieveSecret(webhook.id)
)
writeRootEnv({ DODO_PAYMENTS_WEBHOOK_KEY: secret })
console.log(
  `Dodo test-mode webhook registered at ${url}. Signing secret saved in the root .env. Watch deliveries with pnpm local:logs.`
)
