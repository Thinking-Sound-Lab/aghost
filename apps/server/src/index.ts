import { serve } from "@hono/node-server"
import { createApi, loadApiConfig } from "@workspace/api"

const config = loadApiConfig(process.env)
const port = Number(process.env.API_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Set API_PORT to a valid port in the root .env.")
const hostname = process.env.API_HOST
if (!hostname) throw new Error("Set API_HOST in the root .env.")

const api = createApi(config)
const server = serve({ fetch: api.fetch, port, hostname }, () => {
  console.log(`aghost API listening at http://localhost:${port}/api`)
  if (!config.zernio.apiKey)
    console.log(
      "Zernio is not configured. Add ZERNIO_API_KEY to the root .env to connect Instagram."
    )
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => process.exit(0)))
}
