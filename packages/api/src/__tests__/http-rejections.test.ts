import { randomUUID } from "node:crypto"
import type { InjectOptions } from "fastify"
import { describe, expect, it } from "vitest"
import { createApi } from "../container"
import { apiErrorBodySchema } from "../contract/errors"

// Nothing listens on the discard port, so no request here reaches a service.
const app = createApi({
  appUrl: "http://localhost:3000",
  supabase: {
    url: "http://127.0.0.1:9",
    publishableKey: "publishable",
    secretKey: "secret",
  },
  zernio: {
    apiUrl: "http://127.0.0.1:9",
    apiKey: "",
    webhookSecret: "secret",
  },
})

const json = {
  origin: "http://localhost:3000",
  "content-type": "application/json",
}

/** The web client can only read rejections in the contract's error format. */
async function reject(options: InjectOptions) {
  const response = await app.inject(options)
  return {
    status: response.statusCode,
    error: apiErrorBodySchema.parse(response.json()).error,
  }
}

describe("requests the API rejects", () => {
  it("answers a malformed URL in the API's error format", async () => {
    expect(await reject({ method: "GET", url: "/api/%zz" })).toMatchObject({
      status: 400,
      error: { code: "bad_request" },
    })
  })

  it("routes opaque conversation ids longer than the router's default", async () => {
    const thread = `/api/inbox/${randomUUID()}/${"c".repeat(300)}`
    // Signing in is the route's first check.
    expect(await reject({ method: "GET", url: thread })).toMatchObject({
      status: 401,
      error: { code: "unauthenticated" },
    })
  })

  it("asks for valid JSON when the body does not parse", async () => {
    expect(
      await reject({
        method: "POST",
        url: "/api/auth/sign-in",
        headers: json,
        payload: "{nope",
      })
    ).toEqual({
      status: 400,
      error: { code: "bad_request", message: "Send a valid JSON body." },
    })
  })

  it("keeps the status of a body over the size limit", async () => {
    expect(
      await reject({
        method: "POST",
        url: "/api/webhooks/zernio",
        headers: { "content-type": "application/json" },
        payload: "x".repeat(2 * 1024 * 1024),
      })
    ).toEqual({
      status: 413,
      error: { code: "bad_request", message: "The request body is too large." },
    })
  })

  it("answers an unknown endpoint with not_found", async () => {
    expect(await reject({ method: "GET", url: "/api/nope" })).toMatchObject({
      status: 404,
      error: { code: "not_found" },
    })
  })
})
