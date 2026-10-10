import { randomUUID } from "node:crypto"
import type { InjectOptions } from "fastify"
import { afterEach, describe, expect, it, vi } from "vitest"
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
        url: "/api/auth/sign-out",
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

describe("Google sign-in", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("sends the browser to the address Supabase answers with and keeps the PKCE verifier in an HttpOnly cookie", async () => {
    const googleUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?state=signed"
    const supabase = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: googleUrl } })
      )
    vi.stubGlobal("fetch", supabase)
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/google",
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(googleUrl)
    const [address, options] = supabase.mock.calls[0]!
    const authorize = new URL(String(address))
    expect(authorize.origin + authorize.pathname).toBe(
      "http://127.0.0.1:9/auth/v1/authorize"
    )
    expect(Object.fromEntries(authorize.searchParams)).toMatchObject({
      provider: "google",
      redirect_to: "http://localhost:3000/api/auth/callback",
      code_challenge: expect.stringMatching(/.+/),
      code_challenge_method: "s256",
      prompt: "select_account",
    })
    expect(options).toMatchObject({ redirect: "manual" })
    const cookies = [response.headers["set-cookie"] ?? []].flat().map(String)
    expect(cookies.length).toBeGreaterThan(0)
    expect(
      cookies.every(
        (value) => /HttpOnly/i.test(value) && /SameSite=Lax/i.test(value)
      )
    ).toBe(true)
  })

  it.each([
    [
      "refuses to start the sign-in",
      async () =>
        Response.json(
          { msg: "Unsupported provider: provider is not enabled" },
          { status: 400 }
        ),
    ],
    [
      "cannot be reached",
      async () => {
        throw new TypeError("fetch failed")
      },
    ],
  ])("returns to the login page when Supabase %s", async (_case, answer) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(answer))
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/google",
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      "http://localhost:3000/login?error=google"
    )
  })
})
