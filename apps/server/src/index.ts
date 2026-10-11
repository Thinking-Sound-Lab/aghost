import { createApi, loadApiConfig } from "@workspace/api"

const config = loadApiConfig(process.env)
const port = Number(process.env.API_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Set API_PORT to a valid port in the root .env.")
const host = process.env.API_HOST
if (!host) throw new Error("Set API_HOST in the root .env.")

const api = createApi(config)
if (!config.zernio.apiKey)
  api.log.info(
    "Zernio is not configured. Add ZERNIO_API_KEY to the root .env to connect Instagram."
  )
if (!config.posthog)
  api.log.info(
    "PostHog is not configured. Add POSTHOG_KEY to the root .env to record product analytics."
  )

// Stop accepting connections and let requests in flight finish.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => api.close().then(() => process.exit(0)))
}

await api.listen({ port, host })
