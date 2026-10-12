import { request } from "node:http"
import Fastify from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApiClient } from "../client"

describe("browser DELETE requests forwarded with chunked encoding", () => {
  const app = Fastify()
  const removed: string[] = []
  let client: ReturnType<typeof createApiClient>

  app.delete<{ Params: { resource: string; id: string } }>(
    "/api/:resource/:id",
    async (req, reply) => {
      removed.push(`${req.params.resource}/${req.params.id}`)
      return reply.code(204).send()
    }
  )

  beforeAll(async () => {
    const address = await app.listen({ host: "127.0.0.1", port: 0 })
    // Model a proxy forwarding the browser's request as a stream, without a
    // Content-Length. Use real HTTP so Fastify sees the transfer encoding.
    const transport: typeof fetch = (input, options) =>
      new Promise((resolve, reject) => {
        const req = request(
          String(input),
          {
            method: options?.method,
            headers: {
              ...Object.fromEntries(new Headers(options?.headers)),
              "transfer-encoding": "chunked",
            },
          },
          (res) => {
            const chunks: Buffer[] = []
            res.on("data", (chunk: Buffer) => chunks.push(chunk))
            res.on("error", reject)
            res.on("end", () =>
              resolve(
                new Response(
                  res.statusCode === 204 ? null : Buffer.concat(chunks),
                  {
                    status: res.statusCode,
                    headers: {
                      "Content-Type": String(res.headers["content-type"] ?? ""),
                    },
                  }
                )
              )
            )
          }
        )
        req.on("error", reject)
        req.end(options?.body)
      })
    client = createApiClient(`${address}/api`, transport)
  })

  afterAll(async () => app.close())

  it.each([
    ["disconnects an Instagram account", "accounts"],
    ["deletes an automation", "automations"],
    ["revokes an API key", "api-keys"],
  ])("%s", async (_action, resource) => {
    const id = "fixture-id"
    const result =
      resource === "accounts"
        ? client.accounts.remove(id)
        : resource === "automations"
          ? client.automations.remove(id)
          : client.apiKeys.revoke(id)
    await expect(result).resolves.toBeUndefined()
    expect(removed).toContain(`${resource}/${id}`)
  })
})
