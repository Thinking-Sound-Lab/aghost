import { createHash, randomBytes, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
  type OAuthClientMetadata,
  type OAuthClientProvider,
  type StoredOAuthClientInformation,
  type StoredOAuthTokens,
} from "@modelcontextprotocol/client"
import { createClient } from "@supabase/supabase-js"
import { createAdminSupabaseClient } from "@workspace/supabase/server"
import type { Database } from "@workspace/supabase/types"
import type { InjectOptions } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { loadApiConfig } from "../config"
import { createApi } from "../container"
import type { ApiKey } from "../contract/api-key"
import type {
  AuthorizationDecision,
  AuthorizationRequest,
} from "../contract/oauth"
import type { ApiApp } from "../http/app"
import { recordingAnalytics } from "./analytics-fixture"
import {
  grantPlan,
  signInDisposableUser,
  workspaceIdOf,
} from "./session-fixture"

const config = {
  ...loadApiConfig(
    parseEnv(readFileSync(new URL("../../../../.env", import.meta.url), "utf8"))
  ),
  // No test reaches Zernio or PostHog.
  zernio: { apiUrl: "http://127.0.0.1:9", apiKey: "", webhookSecret: "" },
  posthog: null,
}
if (
  !["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname)
) {
  throw new Error("OAuth integration tests may only use local Supabase.")
}
const admin = createAdminSupabaseClient(config.supabase)
const appOrigin = new URL(config.appUrl).origin
const mcpUrl = new URL("/api/mcp", appOrigin)
const CALLBACK = "http://127.0.0.1:43123/callback"

function pkce() {
  const verifier = randomBytes(32).toString("base64url")
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  }
}

/** An MCP client's OAuth state, kept in memory like a desktop app keeps it. */
class MemoryProvider implements OAuthClientProvider {
  client: StoredOAuthClientInformation | undefined
  saved: StoredOAuthTokens | undefined
  verifier = ""
  authorizationUrl: URL | undefined

  get redirectUrl() {
    return CALLBACK
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "Integration agent",
      redirect_uris: [CALLBACK],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }
  }

  clientInformation() {
    return this.client
  }

  saveClientInformation(client: StoredOAuthClientInformation) {
    this.client = client
  }

  tokens() {
    return this.saved
  }

  saveTokens(tokens: StoredOAuthTokens) {
    this.saved = tokens
  }

  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url
  }

  saveCodeVerifier(verifier: string) {
    this.verifier = verifier
  }

  codeVerifier() {
    return this.verifier
  }
}

describe("MCP clients sign in with OAuth against PostgreSQL", () => {
  let app: ApiApp
  let address: string
  let workspaceId: string
  let ownerCookie: string
  let unpaidCookie: string
  let ownerAccessToken: string
  const userIds: string[] = []
  const clients: Client[] = []

  /** The web app's origin, which forwards these paths to the API. */
  const viaWebApp: typeof fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== appOrigin)
      throw new Error(`The client left the app's origin for ${url}`)
    // A buffered body, which fetch can send again after a 401.
    return fetch(`${address}${url.pathname}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      signal: request.signal,
    })
  }

  async function session(
    path: string,
    method: InjectOptions["method"] = "GET",
    cookie = ownerCookie
  ) {
    return app.inject({
      method,
      url: `/api${path}`,
      headers: {
        cookie,
        origin: appOrigin,
        ...(method !== "GET" && { "content-type": "application/json" }),
      },
      ...(method !== "GET" && { payload: "{}" }),
    })
  }

  async function register(metadata: Record<string, unknown>) {
    return app.inject({
      method: "POST",
      url: "/api/oauth/register",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(metadata),
    })
  }

  async function publicClient(redirectUri = CALLBACK) {
    const response = await register({
      client_name: "Test client",
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
    })
    expect(response.statusCode).toBe(201)
    return response.json<{ client_id: string }>().client_id
  }

  function authorizeUrl(params: Record<string, string>) {
    return `/api/oauth/authorize?${new URLSearchParams({
      response_type: "code",
      code_challenge_method: "S256",
      ...params,
    })}`
  }

  /** Starts a sign-in and returns the consent page's request id. */
  async function startSignIn(
    clientId: string,
    challenge: string,
    redirectUri = CALLBACK
  ) {
    const response = await app.inject({
      url: authorizeUrl({
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: challenge,
        state: "opaque-state",
        resource: mcpUrl.toString(),
      }),
    })
    expect(response.statusCode).toBe(302)
    const consent = new URL(String(response.headers.location))
    expect(consent.origin + consent.pathname).toBe(`${appOrigin}/authorize`)
    return consent.searchParams.get("request")!
  }

  async function approve(requestId: string) {
    const response = await session(
      `/oauth/requests/${requestId}/approve`,
      "POST"
    )
    expect(response.statusCode).toBe(200)
    return new URL(response.json<AuthorizationDecision>().redirectUrl)
  }

  async function token(params: Record<string, string>, authorization?: string) {
    return app.inject({
      method: "POST",
      url: "/api/oauth/token",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(authorization && { authorization }),
      },
      payload: new URLSearchParams(params).toString(),
    })
  }

  beforeAll(async () => {
    app = createApi(config, { analytics: recordingAnalytics().analytics })
    address = await app.listen({ port: 0, host: "127.0.0.1" })
    const cookies: string[] = []
    for (let index = 0; index < 2; index++) {
      const email = `aghost-oauth-${randomUUID()}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (error || !data.user)
        throw new Error("Could not create a disposable OAuth test user")
      userIds.push(data.user.id)
      const jar = new Map<string, string>()
      const signedIn = await signInDisposableUser(config, email, jar)
      if (index === 0) ownerAccessToken = signedIn.access_token
      cookies.push(
        [...jar].map(([name, value]) => `${name}=${value}`).join("; ")
      )
    }
    ;[ownerCookie, unpaidCookie] = cookies as [string, string]
    workspaceId = await workspaceIdOf(config, userIds[0]!)
    await grantPlan(config, workspaceId, "pro")
  })

  afterAll(async () => {
    for (const client of clients) await client.close()
    await app?.close()
    for (const id of userIds) {
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) throw new Error("Could not clean up an OAuth test user")
    }
  })

  it("lets the MCP SDK client discover, register, sign in and call tools with the issued key", async () => {
    const provider = new MemoryProvider()
    const first = new StreamableHTTPClientTransport(mcpUrl, {
      authProvider: provider,
      fetch: viaWebApp,
    })
    const client = new Client({ name: "oauth-integration", version: "1.0.0" })
    clients.push(client)
    await expect(client.connect(first)).rejects.toBeInstanceOf(
      UnauthorizedError
    )

    const authorizationUrl = provider.authorizationUrl!
    expect(authorizationUrl.origin + authorizationUrl.pathname).toBe(
      `${appOrigin}/api/oauth/authorize`
    )
    expect(authorizationUrl.searchParams.get("resource")).toBe(
      mcpUrl.toString()
    )
    const consent = await app.inject({
      url: authorizationUrl.pathname + authorizationUrl.search,
    })
    const requestId = new URL(
      String(consent.headers.location)
    ).searchParams.get("request")!
    const described = await session(`/oauth/requests/${requestId}`)
    expect(described.json<AuthorizationRequest>()).toEqual({
      id: requestId,
      clientName: "Integration agent",
      destination: "127.0.0.1:43123",
      local: true,
    })

    const callback = await approve(requestId)
    expect(callback.origin + callback.pathname).toBe(CALLBACK)
    expect(callback.searchParams.get("iss")).toBe(appOrigin)
    await first.finishAuth(callback.searchParams)
    expect(provider.saved).toMatchObject({
      access_token: expect.stringMatching(/^agh_[A-Za-z0-9_-]{43}$/),
      token_type: "Bearer",
    })
    expect(provider.saved).not.toHaveProperty("refresh_token")

    const connected = new Client({
      name: "oauth-integration",
      version: "1.0.0",
    })
    clients.push(connected)
    await connected.connect(
      new StreamableHTTPClientTransport(mcpUrl, {
        authProvider: provider,
        fetch: viaWebApp,
      })
    )
    const result = await connected.callTool({ name: "get_workspace" })
    expect(result.structuredContent).toMatchObject({
      data: { id: workspaceId },
    })

    // The connection is an API key the owner sees and can revoke.
    const keys = (await session("/api-keys")).json<ApiKey[]>()
    const issued = keys.find((key) => key.name === "Integration agent")!
    expect(issued).toMatchObject({ expiresAt: null, revokedAt: null })
    expect(issued.lastUsedAt).not.toBeNull()
    expect((await session(`/api-keys/${issued.id}`, "DELETE")).statusCode).toBe(
      204
    )
    const revoked = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: {
        authorization: `Bearer ${provider.saved!.access_token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      payload: { jsonrpc: "2.0", id: 1, method: "ping" },
    })
    expect(revoked.statusCode).toBe(401)
  })

  it("publishes discovery documents and points unauthenticated MCP requests at them", async () => {
    const challenge = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: { "content-type": "application/json" },
      payload: { jsonrpc: "2.0", id: 1, method: "ping" },
    })
    expect(challenge.statusCode).toBe(401)
    expect(challenge.headers["www-authenticate"]).toBe(
      `Bearer realm="aghost", resource_metadata="${appOrigin}/.well-known/oauth-protected-resource/api/mcp"`
    )
    const rest = await app.inject({ url: "/api/v1/workspace" })
    expect(rest.headers["www-authenticate"]).toBe('Bearer realm="aghost"')

    for (const path of [
      "/.well-known/oauth-protected-resource/api/mcp",
      "/.well-known/oauth-protected-resource",
    ])
      expect((await app.inject({ url: path })).json()).toEqual({
        resource: mcpUrl.toString(),
        authorization_servers: [appOrigin],
        bearer_methods_supported: ["header"],
        resource_name: "aghost",
      })
    expect(
      (
        await app.inject({ url: "/.well-known/oauth-authorization-server" })
      ).json()
    ).toMatchObject({
      issuer: appOrigin,
      authorization_endpoint: `${appOrigin}/api/oauth/authorize`,
      token_endpoint: `${appOrigin}/api/oauth/token`,
      registration_endpoint: `${appOrigin}/api/oauth/register`,
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: [
        "none",
        "client_secret_post",
        "client_secret_basic",
      ],
    })
  })

  it("registers only safe redirect addresses and supported grants", async () => {
    for (const redirect of [
      "http://example.com/callback",
      "javascript:alert(1)",
      "https://example.com/callback#fragment",
      "not a url",
    ]) {
      const response = await register({ redirect_uris: [redirect] })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({ error: "invalid_redirect_uri" })
    }
    const grant = await register({
      redirect_uris: [CALLBACK],
      grant_types: ["client_credentials"],
    })
    expect(grant.json()).toMatchObject({ error: "invalid_client_metadata" })
    const name = await register({
      client_name: "Claude\u0000",
      redirect_uris: [CALLBACK],
    })
    expect(name.json()).toMatchObject({ error: "invalid_client_metadata" })

    const appScheme = await register({
      client_name: "x".repeat(200),
      redirect_uris: ["cursor://anysphere.cursor-retrieval/oauth/callback"],
      token_endpoint_auth_method: "none",
    })
    expect(appScheme.statusCode).toBe(201)
    expect(appScheme.json()).toMatchObject({
      client_name: "x".repeat(80),
      token_endpoint_auth_method: "none",
    })
    expect(appScheme.json()).not.toHaveProperty("client_secret")
  })

  it("authenticates confidential clients at the token endpoint", async () => {
    const registered = await register({
      client_name: "Confidential client",
      redirect_uris: ["https://agent.example/callback"],
    })
    expect(registered.statusCode).toBe(201)
    const client = registered.json<{
      client_id: string
      client_secret: string
      token_endpoint_auth_method: string
    }>()
    expect(client.token_endpoint_auth_method).toBe("client_secret_basic")
    expect(client.client_secret).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const { verifier, challenge } = pkce()
    const code = (
      await approve(
        await startSignIn(
          client.client_id,
          challenge,
          "https://agent.example/callback"
        )
      )
    ).searchParams.get("code")!
    const exchange = {
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://agent.example/callback",
      code_verifier: verifier,
    }
    const basic = (secret: string) =>
      `Basic ${Buffer.from(`${client.client_id}:${secret}`).toString("base64")}`

    const unauthenticated = await token({
      ...exchange,
      client_id: client.client_id,
    })
    expect(unauthenticated.statusCode).toBe(401)
    expect(unauthenticated.json()).toMatchObject({ error: "invalid_client" })
    const wrong = await token(exchange, basic("wrong"))
    expect(wrong.statusCode).toBe(401)
    expect(wrong.headers["www-authenticate"]).toBe('Basic realm="aghost"')

    const issued = await token(exchange, basic(client.client_secret))
    expect(issued.statusCode).toBe(200)
    expect(issued.json()).toMatchObject({
      access_token: expect.stringMatching(/^agh_/),
      token_type: "Bearer",
    })
  })

  it("sends invalid requests back to the app, or to the consent page when they cannot be", async () => {
    const clientId = await publicClient()
    const unknown = await app.inject({
      url: authorizeUrl({
        client_id: randomUUID(),
        redirect_uri: CALLBACK,
        code_challenge: pkce().challenge,
      }),
    })
    expect(unknown.headers.location).toBe(
      `${appOrigin}/authorize?error=invalid_request`
    )
    const foreign = await app.inject({
      url: authorizeUrl({
        client_id: clientId,
        redirect_uri: "https://attacker.example/callback",
        code_challenge: pkce().challenge,
      }),
    })
    expect(foreign.headers.location).toBe(
      `${appOrigin}/authorize?error=invalid_request`
    )

    for (const [params, error] of [
      [{ code_challenge_method: "plain" }, "invalid_request"],
      [{ code_challenge: "too-short" }, "invalid_request"],
      [{ response_type: "token" }, "unsupported_response_type"],
      [{ resource: "https://other.example/mcp" }, "invalid_target"],
      [{ state: "kept\u0000" }, "invalid_request"],
    ] as const) {
      const response = await app.inject({
        url: authorizeUrl({
          client_id: clientId,
          redirect_uri: CALLBACK,
          code_challenge: pkce().challenge,
          state: "kept",
          ...params,
        }),
      })
      const back = new URL(String(response.headers.location))
      expect(back.origin + back.pathname).toBe(CALLBACK)
      expect(Object.fromEntries(back.searchParams)).toMatchObject({
        error,
        iss: appOrigin,
        ...(!("state" in params) && { state: "kept" }),
      })
    }
  })

  it("lets an app on this computer use any port of its registered loopback address", async () => {
    const clientId = await publicClient("http://localhost/callback")
    const { challenge } = pkce()
    const requestId = await startSignIn(
      clientId,
      challenge,
      "http://localhost:51234/callback"
    )
    expect(
      (await session(`/oauth/requests/${requestId}`)).json()
    ).toMatchObject({ destination: "localhost:51234", local: true })
    const otherPath = await app.inject({
      url: authorizeUrl({
        client_id: clientId,
        redirect_uri: "http://localhost:51234/elsewhere",
        code_challenge: challenge,
      }),
    })
    expect(otherPath.headers.location).toBe(
      `${appOrigin}/authorize?error=invalid_request`
    )
  })

  it("spends a code on its first exchange, even when the verifier is wrong", async () => {
    const clientId = await publicClient()
    const { verifier, challenge } = pkce()
    const code = (
      await approve(await startSignIn(clientId, challenge))
    ).searchParams.get("code")!
    const exchange = {
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: CALLBACK,
      resource: mcpUrl.toString(),
    }
    const wrong = await token({ ...exchange, code_verifier: pkce().verifier })
    expect(wrong.statusCode).toBe(400)
    expect(wrong.json()).toMatchObject({ error: "invalid_grant" })
    const replay = await token({ ...exchange, code_verifier: verifier })
    expect(replay.json()).toMatchObject({ error: "invalid_grant" })

    const fresh = pkce()
    const second = (
      await approve(await startSignIn(clientId, fresh.challenge))
    ).searchParams.get("code")!
    const issued = await token({
      ...exchange,
      code: second,
      code_verifier: fresh.verifier,
    })
    expect(issued.statusCode).toBe(200)
    expect(
      (
        await token({
          ...exchange,
          code: second,
          code_verifier: fresh.verifier,
        })
      ).json()
    ).toMatchObject({ error: "invalid_grant" })

    const refresh = await token({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: "anything",
    })
    expect(refresh.json()).toMatchObject({ error: "unsupported_grant_type" })
    const repeated = await app.inject({
      method: "POST",
      url: "/api/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: `grant_type=authorization_code&client_id=${clientId}&code=a&code=b&redirect_uri=${encodeURIComponent(CALLBACK)}&code_verifier=${verifier}`,
    })
    expect(repeated.json()).toMatchObject({ error: "invalid_request" })
  })

  it("needs the owner's session and plan to approve, and returns a denial to the app", async () => {
    const clientId = await publicClient()
    const requestId = await startSignIn(clientId, pkce().challenge)
    const anonymous = await app.inject({
      url: `/api/oauth/requests/${requestId}`,
    })
    expect(anonymous.statusCode).toBe(401)
    expect(
      (await session(`/oauth/requests/${requestId}`, "GET", unpaidCookie))
        .statusCode
    ).toBe(402)
    expect(
      (
        await session(
          `/oauth/requests/${requestId}/approve`,
          "POST",
          unpaidCookie
        )
      ).statusCode
    ).toBe(402)
    const crossSite = await app.inject({
      method: "POST",
      url: `/api/oauth/requests/${requestId}/approve`,
      headers: {
        cookie: ownerCookie,
        origin: "https://attacker.example",
        "content-type": "application/json",
      },
      payload: "{}",
    })
    expect(crossSite.statusCode).toBe(400)

    const denied = await session(
      `/oauth/requests/${requestId}/deny`,
      "POST",
      unpaidCookie
    )
    expect(denied.statusCode).toBe(200)
    const back = new URL(denied.json<AuthorizationDecision>().redirectUrl)
    expect(Object.fromEntries(back.searchParams)).toMatchObject({
      error: "access_denied",
      state: "opaque-state",
    })
    const decided = await session(
      `/oauth/requests/${requestId}/approve`,
      "POST"
    )
    expect(decided.statusCode).toBe(404)
  })

  it("keeps OAuth clients and codes out of Supabase user access", async () => {
    for (const authorization of [undefined, `Bearer ${ownerAccessToken}`]) {
      const direct = createClient<Database>(
        config.supabase.url,
        config.supabase.publishableKey,
        {
          global: {
            headers: authorization ? { Authorization: authorization } : {},
          },
        }
      )
      for (const table of ["oauth_clients", "oauth_authorizations"] as const)
        expect((await direct.from(table).select()).error?.code).toBe("42501")
    }
  })
})
