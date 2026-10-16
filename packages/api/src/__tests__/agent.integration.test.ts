import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client"
import { createClient } from "@supabase/supabase-js"
import { createAdminSupabaseClient } from "@workspace/supabase/server"
import type { Database } from "@workspace/supabase/types"
import type { InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { loadApiConfig } from "../config"
import { createApi } from "../container"
import {
  API_KEY_READ_SCOPES,
  API_KEY_SCOPES,
  type ApiKeyScope,
  type CreatedApiKey,
} from "../contract/api-key"
import type { Automation } from "../contract/automation"
import type { InstagramAccount } from "../contract/account"
import type { ApiApp } from "../http/app"
import { hashApiKey } from "../modules/api-keys/api-key.service"
import { recordingAnalytics } from "./analytics-fixture"
import {
  grantPlan,
  signInDisposableUser,
  workspaceIdOf,
} from "./session-fixture"
import { startZernioFixture } from "./zernio-fixture"

const config = {
  ...loadApiConfig(
    parseEnv(readFileSync(new URL("../../../../.env", import.meta.url), "utf8"))
  ),
  // Tests record events in memory, never in a PostHog project.
  posthog: null,
}
const recorded = recordingAnalytics()
if (
  !["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname)
) {
  throw new Error("Agent integration tests may only use local Supabase.")
}
const admin = createAdminSupabaseClient(config.supabase)

function rpcResponse(response: LightMyRequestResponse) {
  if (String(response.headers["content-type"]).includes("application/json"))
    return response.json()
  const data = response.body
    .split("\n")
    .find((line) => line.startsWith("data:"))
  if (!data) throw new Error("MCP returned neither JSON nor an SSE message")
  return JSON.parse(data.slice(5).trim())
}

describe("workspace API keys, REST and MCP against PostgreSQL and local provider fixture", () => {
  let app: ApiApp
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let address: string
  let account: InstagramAccount
  let workspaceId: string
  let otherWorkspaceId: string
  let ownerCookie: string
  let otherCookie: string
  let ownerAccessToken: string
  const userIds: string[] = []
  const clients: Client[] = []

  async function session(
    path: string,
    method: InjectOptions["method"] = "GET",
    body?: unknown,
    cookie = ownerCookie
  ) {
    return app.inject({
      method,
      url: `/api${path}`,
      headers: {
        cookie,
        origin: new URL(config.appUrl).origin,
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      ...(body !== undefined && { payload: JSON.stringify(body) }),
    })
  }

  async function key(
    scopes: readonly ApiKeyScope[] = API_KEY_READ_SCOPES,
    cookie = ownerCookie
  ) {
    const response = await session(
      "/api-keys",
      "POST",
      { name: "Integration agent", scopes },
      cookie
    )
    expect(response.statusCode).toBe(201)
    return response.json<CreatedApiKey>()
  }

  async function rest(
    token: string,
    path: string,
    method: InjectOptions["method"] = "GET",
    body?: unknown
  ) {
    return app.inject({
      method,
      url: `/api/v1${path}`,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      ...(body !== undefined && { payload: JSON.stringify(body) }),
    })
  }

  const input = () => ({
    instagramAccountId: account.id,
    name: "Agent guide",
    status: "paused" as const,
    trigger: {
      postScope: "specific_post" as const,
      platformPostId: fixture.postId,
    },
    keywords: [" Guide ", "GUIDE"],
    matchMode: "word" as const,
    openingDm: null,
    dmMessage: "Here is the guide, {{first_name}}.",
    dmButtons: [{ label: "Get guide", url: "https://example.com/guide" }],
    commentReply: null,
    requireFollow: false,
  })

  async function mcp(token: string) {
    const client = new Client({ name: "aghost-integration", version: "1.0.0" })
    clients.push(client)
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${address}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      })
    )
    return client
  }

  beforeAll(async () => {
    fixture = await startZernioFixture()
    app = createApi(
      {
        ...config,
        zernio: {
          apiUrl: fixture.apiUrl,
          apiKey: "fixture-api-key",
          webhookSecret: "fixture-secret",
        },
      },
      { analytics: recorded.analytics }
    )
    address = await app.listen({ port: 0, host: "127.0.0.1" })
    for (let index = 0; index < 2; index++) {
      const email = `aghost-agent-${randomUUID()}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (error || !data.user)
        throw new Error("Could not create disposable agent integration user")
      userIds.push(data.user.id)
      const cookies = new Map<string, string>()
      const signedIn = await signInDisposableUser(config, email, cookies)
      const cookie = [...cookies]
        .map(([name, value]) => `${name}=${value}`)
        .join("; ")
      const id = await workspaceIdOf(config, data.user.id)
      if (index === 0) {
        ownerCookie = cookie
        workspaceId = id
        ownerAccessToken = signedIn.access_token
      } else {
        otherCookie = cookie
        otherWorkspaceId = id
      }
    }
    await grantPlan(config, workspaceId, "growth")
    await grantPlan(config, otherWorkspaceId, "pro")
    expect((await session("/accounts/connect", "POST", {})).statusCode).toBe(
      200
    )
    const synced = await session("/accounts/sync", "POST", {})
    expect(synced.statusCode).toBe(200)
    account = synced.json<InstagramAccount[]>()[0]!
  })

  afterAll(async () => {
    for (const client of clients) await client.close()
    await app?.close()
    await fixture?.close()
    for (const id of userIds) {
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) throw new Error("Could not clean up agent integration user")
    }
  })

  it("shows a token once, stores only its hash, and keeps all key data out of Supabase user access", async () => {
    const created = await key()
    expect(created.token).toMatch(/^agh_[A-Za-z0-9_-]{43}$/)
    expect(created.key).not.toHaveProperty("tokenHash")
    expect(created.key).not.toHaveProperty("workspaceId")
    const stored = await admin
      .from("api_keys")
      .select()
      .eq("id", created.key.id)
      .single()
    expect(stored.error).toBeNull()
    expect(stored.data).toMatchObject({
      token_hash: hashApiKey(created.token),
      workspace_id: workspaceId,
      last_used_at: null,
    })
    expect(JSON.stringify(stored.data)).not.toContain(created.token)
    const list = await session("/api-keys")
    expect(list.json()).toContainEqual(created.key)
    expect(list.body).not.toContain(created.token)
    expect(list.body).not.toContain("token_hash")
    expect(
      (await session("/api-keys", "GET", undefined, otherCookie)).json()
    ).toEqual([])
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
      expect((await direct.from("api_keys").select()).error?.code).toBe("42501")
      expect(
        (
          await direct.from("api_keys").insert({
            workspace_id: workspaceId,
            name: "Forged",
            token_hash: "a".repeat(64),
            token_prefix: "agh_abcdefgh",
            scopes: ["automations:write"],
          })
        ).error?.code
      ).toBe("42501")
    }
  })

  it("creates a full-access key without setup fields or expiry and uses it through REST and MCP", async () => {
    const response = await session("/api-keys", "POST", {})
    expect(response.statusCode).toBe(201)
    const created = response.json<CreatedApiKey>()
    expect(created.token).toMatch(/^agh_[A-Za-z0-9_-]{43}$/)
    expect(created.key).toMatchObject({
      name: "API key",
      scopes: [...API_KEY_SCOPES],
      expiresAt: null,
    })
    const stored = await admin
      .from("api_keys")
      .select("scopes, expires_at, token_hash")
      .eq("id", created.key.id)
      .single()
    expect(stored.error).toBeNull()
    expect(stored.data).toEqual({
      scopes: [...API_KEY_SCOPES],
      expires_at: null,
      token_hash: hashApiKey(created.token),
    })

    const client = await mcp(created.token)
    const { tools } = await client.listTools()
    expect(tools).toHaveLength(23)
    expect(tools.map((tool) => tool.name)).toContain("create_automation")
    expect(tools.map((tool) => tool.name)).toContain("schedule_post")
    expect(tools.map((tool) => tool.name)).toContain("send_message")
    const workspace = await client.callTool({
      name: "get_workspace",
      arguments: {},
    })
    expect(workspace.structuredContent).toMatchObject({
      data: { id: workspaceId },
    })

    const automation = await rest(
      created.token,
      "/automations",
      "POST",
      input()
    )
    expect(automation.statusCode).toBe(201)
    expect(
      (
        await rest(
          created.token,
          `/automations/${automation.json<Automation>().id}`,
          "DELETE"
        )
      ).statusCode
    ).toBe(204)
    expect(
      (await session(`/api-keys/${created.key.id}`, "DELETE")).statusCode
    ).toBe(204)
    expect((await rest(created.token, "/workspace")).statusCode).toBe(401)
    await expect(
      client.callTool({ name: "get_workspace", arguments: {} })
    ).rejects.toThrow()

    // Each call is recorded with the transport the agent used.
    expect(
      recorded.events
        .filter(
          ({ event }) =>
            "api_key_id" in event && event.api_key_id === created.key.id
        )
        .map(({ source, event }) => [
          source,
          event.name,
          "tool" in event ? event.tool : null,
        ])
    ).toEqual([
      ["dashboard", "api_key_created", null],
      ["mcp", "agent_tool_called", "get_workspace"],
      ["api", "agent_tool_called", "create_automation"],
      ["api", "agent_tool_called", "delete_automation"],
      ["dashboard", "api_key_revoked", null],
    ])
    expect(
      recorded.events.find(
        ({ event }) =>
          event.name === "automation_created" &&
          event.automation_id === automation.json<Automation>().id
      )?.source
    ).toBe("api")
  })

  it("requires keys on agent routes and browser sessions on key management, retaining origin protection", async () => {
    const created = await key()
    expect((await session("/v1/workspace")).statusCode).toBe(401)
    expect((await session("/mcp", "POST", {})).statusCode).toBe(401)
    for (const authorization of [
      "",
      "Bearer invalid",
      "Basic secret",
      `Bearer ${created.token} extra`,
    ]) {
      const rejected = await app.inject({
        url: "/api/v1/workspace",
        headers: { authorization },
      })
      expect(rejected.statusCode).toBe(401)
      expect(rejected.headers["www-authenticate"]).toContain("Bearer")
    }
    const noSession = await app.inject({
      url: "/api/api-keys",
      headers: { authorization: `Bearer ${created.token}` },
    })
    expect(noSession.statusCode).toBe(401)
    expect(
      (await rest(created.token, "/api-keys", "POST", {})).statusCode
    ).toBe(400)
    expect((await rest(created.token, "/api-keys")).statusCode).toBe(404)
    const crossOrigin = await app.inject({
      method: "POST",
      url: "/api/v1/automations",
      headers: {
        authorization: `Bearer ${created.token}`,
        origin: "https://foreign.example",
        "content-type": "application/json",
      },
      payload: input(),
    })
    expect(crossOrigin.statusCode).toBe(400)
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/automations",
          headers: {
            authorization: `Bearer ${created.token}`,
            "content-type": "application/json",
          },
          payload: input(),
        })
      ).statusCode
    ).toBe(400)
    expect(
      (await session("/api-keys", "POST", { name: "Bad", scopes: ["admin"] }))
        .statusCode
    ).toBe(422)
    expect(
      (
        await session("/api-keys", "POST", {
          name: "Bad",
          scopes: [],
          expiresAt: null,
        })
      ).statusCode
    ).toBe(422)
    expect(
      (
        await session("/api-keys", "POST", {
          name: "Expired",
          scopes: API_KEY_READ_SCOPES,
          expiresAt: "2020-01-01T00:00:00Z",
        })
      ).statusCode
    ).toBe(422)
  })

  it("enforces individual scopes before a provider write and records the last use", async () => {
    const readOnly = await key()
    const before = fixture.requests.length
    expect(
      (await rest(readOnly.token, "/automations", "POST", input())).statusCode
    ).toBe(403)
    expect(
      (
        await rest(
          readOnly.token,
          `/inbox/${account.id}/${encodeURIComponent(fixture.conversationId)}`,
          "POST",
          { text: "Hello" }
        )
      ).statusCode
    ).toBe(403)
    expect(fixture.requests.length).toBe(before)
    const restricted = await key(["workspace:read"])
    expect((await rest(restricted.token, "/accounts")).statusCode).toBe(403)
    const workspace = await rest(restricted.token, "/workspace")
    expect(workspace.statusCode).toBe(200)
    expect(workspace.json().id).toBe(workspaceId)
    expect(workspace.headers["cache-control"]).toContain("no-store")
    const used = await admin
      .from("api_keys")
      .select("last_used_at")
      .eq("id", restricted.key.id)
      .single()
    expect(used.data?.last_used_at).not.toBeNull()
    const calls = recorded.events.flatMap(({ event }) =>
      event.name === "agent_tool_called" &&
      event.api_key_id === restricted.key.id
        ? [event]
        : []
    )
    expect(calls).toMatchObject([
      { tool: "list_accounts", outcome: "failed", error_code: "forbidden" },
      { tool: "get_workspace", outcome: "succeeded", error_code: null },
    ])
  })

  it("supports a full REST automation workflow with shared validation, posts, activity, and related reads", async () => {
    const write = await key(API_KEY_SCOPES)
    expect((await rest(write.token, "/accounts")).json()).toContainEqual(
      account
    )
    expect(
      (await rest(write.token, `/accounts/${account.id}/posts`)).json()[0]
        .platformPostId
    ).toBe(fixture.postId)
    const created = await rest(write.token, "/automations", "POST", {
      ...input(),
      workspaceId: otherWorkspaceId,
    })
    expect(created.statusCode).toBe(201)
    const automation = created.json<Automation>()
    expect(automation.keywords).toEqual(["Guide"])
    expect(automation).not.toHaveProperty("providerAutomationId")
    expect((await session(`/automations/${automation.id}`)).json()).toEqual(
      automation
    )
    expect(
      (
        await admin
          .from("automations")
          .select("workspace_id")
          .eq("id", automation.id)
          .single()
      ).data?.workspace_id
    ).toBe(workspaceId)
    expect(
      (await rest(write.token, "/automations/stats")).json()[automation.id]
    ).toMatchObject({ dmsSent: 12, linkClicks: 3, triggered: null })
    const activity = await rest(
      write.token,
      `/automations/${automation.id}/activity`
    )
    expect(activity.statusCode).toBe(200)
    expect(activity.json()).toMatchObject({
      total: 1,
      entries: [{ dmStatus: "sent" }],
    })
    expect(
      (
        await rest(
          write.token,
          `/automations/${automation.id}/activity?limit=51&offset=-1`
        )
      ).statusCode
    ).toBe(422)
    // REST input is read inside the recorded call, so a refusal counts.
    expect(
      recorded.events
        .filter(
          ({ event }) =>
            event.name === "agent_tool_called" &&
            event.api_key_id === write.key.id
        )
        .at(-1)?.event
    ).toMatchObject({
      tool: "list_automation_activity",
      outcome: "failed",
      error_code: "validation_failed",
    })
    expect(
      (
        await rest(write.token, "/automations", "POST", {
          ...input(),
          dmButtons: [{ label: "Bad", url: "http://example.com" }],
        })
      ).statusCode
    ).toBe(422)
    const changed = await rest(
      write.token,
      `/automations/${automation.id}`,
      "PATCH",
      { ...input(), name: "Updated by agent" }
    )
    expect(changed.statusCode).toBe(200)
    expect(changed.json().name).toBe("Updated by agent")
    expect(
      (
        await rest(
          write.token,
          `/automations/${automation.id}/status`,
          "PATCH",
          { status: "active" }
        )
      ).json().status
    ).toBe("active")
    expect(
      (await rest(write.token, "/contacts?search=Ann&offset=0")).statusCode
    ).toBe(200)
    expect(
      (await rest(write.token, "/inbox")).json()[0].instagramAccountId
    ).toBe(account.id)
    const thread = `/inbox/${account.id}/${encodeURIComponent(fixture.conversationId)}`
    expect((await rest(write.token, thread)).json()[0].text).toBe(
      "GUIDE please"
    )
    expect(
      (
        await rest(write.token, thread, "POST", {
          text: "Thanks for your comment!",
        })
      ).statusCode
    ).toBe(204)
    expect(
      (await rest(write.token, `/automations/${automation.id}`, "DELETE"))
        .statusCode
    ).toBe(204)
    expect(
      (await rest(write.token, `/automations/${automation.id}`)).statusCode
    ).toBe(404)
  })

  it("blocks cross-workspace resources and foreign conversations before provider writes", async () => {
    const own = await key(API_KEY_SCOPES)
    const foreign = await key(API_KEY_SCOPES, otherCookie)
    const created = (
      await rest(own.token, "/automations", "POST", input())
    ).json<Automation>()
    const before = fixture.requests.length
    for (const [path, method, body] of [
      [`/accounts/${account.id}/posts`, "GET", undefined],
      [`/automations/${created.id}`, "GET", undefined],
      [`/automations/${created.id}/activity`, "GET", undefined],
      [`/automations/${created.id}`, "PATCH", input()],
      [`/automations/${created.id}/status`, "PATCH", { status: "active" }],
      [`/automations/${created.id}`, "DELETE", undefined],
      ["/automations", "POST", input()],
      [
        `/inbox/${account.id}/${encodeURIComponent(fixture.conversationId)}`,
        "GET",
        undefined,
      ],
      [
        `/inbox/${account.id}/${encodeURIComponent(fixture.conversationId)}`,
        "POST",
        { text: "Not allowed" },
      ],
    ] as const) {
      expect((await rest(foreign.token, path, method, body)).statusCode).toBe(
        404
      )
    }
    expect(fixture.requests.length).toBe(before)
    expect((await rest(foreign.token, "/accounts")).json()).toEqual([])
    expect((await rest(foreign.token, "/automations")).json()).toEqual([])
    expect((await rest(foreign.token, "/inbox")).json()).toEqual([])
    const invalidThread = `/inbox/${account.id}/${fixture.foreignConversationId}`
    expect((await rest(own.token, invalidThread)).statusCode).toBe(404)
    expect(
      (await rest(own.token, invalidThread, "POST", { text: "No" })).statusCode
    ).toBe(404)
    expect(
      (
        await session(
          `/api-keys/${own.key.id}`,
          "DELETE",
          undefined,
          otherCookie
        )
      ).statusCode
    ).toBe(404)
    await rest(own.token, `/automations/${created.id}`, "DELETE")
  })

  it("serves a public configured skill without trusting caller URLs or exposing credentials", async () => {
    const before = fixture.requests.length
    const response = await app.inject({
      method: "GET",
      url: "/api/mcp/skill.md",
      headers: { origin: "https://untrusted.example" },
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers["content-type"]).toContain("text/markdown")
    expect(response.headers["content-disposition"]).toContain(
      'filename="SKILL.md"'
    )
    expect(response.headers["cache-control"]).toContain("no-store")
    expect(response.body).toContain(`${new URL(config.appUrl).origin}/api/mcp`)
    expect(response.body).not.toContain("{{AGHOST_APP_URL}}")
    expect(response.body).not.toContain("https://untrusted.example")
    expect(response.body).not.toContain(config.supabase.secretKey)
    expect(response.body).not.toContain(ownerAccessToken)
    expect(fixture.requests.length).toBe(before)
    expect(
      (await app.inject({ method: "GET", url: "/api/mcp" })).statusCode
    ).toBe(401)
  })

  it("publishes an OpenAPI contract matching REST inputs and scope requirements", async () => {
    const read = await key()
    const response = await rest(read.token, "/openapi.json")
    expect(response.statusCode).toBe(200)
    const document = response.json()
    expect(document.openapi).toBe("3.1.0")
    expect(document.paths["/automations"].post).toMatchObject({
      operationId: "create_automation",
      "x-required-scope": "automations:write",
    })
    expect(
      document.paths["/automations/{automationId}"].patch.requestBody.content[
        "application/json"
      ].schema.required
    ).toContain("dmMessage")
    expect(
      document.paths["/automations/{automationId}"].patch.requestBody.content[
        "application/json"
      ].schema.properties
    ).not.toHaveProperty("input")
    expect(
      document.paths["/automations/{automationId}/activity"].get.parameters
    ).toContainEqual(
      expect.objectContaining({
        name: "limit",
        in: "query",
        schema: expect.objectContaining({ maximum: 50 }),
      })
    )
  })

  it("serves the current MCP SDK client with only permitted tools and structured workspace results", async () => {
    const read = await key(["workspace:read", "automations:read"])
    const client = await mcp(read.token)
    const listed = await client.listTools()
    expect(listed.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "get_workspace",
        "list_automations",
        "list_automation_activity",
      ])
    )
    expect(listed.tools.map((tool) => tool.name)).not.toContain(
      "create_automation"
    )
    expect(listed.tools.map((tool) => tool.name)).not.toContain("list_contacts")
    const workspace = await client.callTool({
      name: "get_workspace",
      arguments: {},
    })
    expect(workspace.isError).not.toBe(true)
    expect(workspace.structuredContent).toEqual({
      data: { id: workspaceId, name: "My workspace" },
    })
    const before = fixture.requests.length
    await expect(
      client.callTool({ name: "create_automation", arguments: input() })
    ).rejects.toThrow()
    expect(fixture.requests.length).toBe(before)
  })

  it("runs MCP automation tools and returns safe errors for another workspace", async () => {
    const write = await key(API_KEY_SCOPES)
    const client = await mcp(write.token)
    const create = await client.callTool({
      name: "create_automation",
      arguments: input(),
    })
    expect(create.isError).not.toBe(true)
    const automation = (create.structuredContent as { data: Automation }).data
    expect(automation).toMatchObject({
      name: "Agent guide",
      status: "paused",
      keywords: ["Guide"],
    })
    const activity = await client.callTool({
      name: "list_automation_activity",
      arguments: { automationId: automation.id },
    })
    expect(activity.structuredContent).toMatchObject({
      data: { total: 1, hasMore: false },
    })
    const changed = await client.callTool({
      name: "update_automation",
      arguments: {
        automationId: automation.id,
        input: { ...input(), name: "MCP edited" },
      },
    })
    expect(changed.structuredContent).toMatchObject({
      data: { name: "MCP edited" },
    })
    const active = await client.callTool({
      name: "set_automation_status",
      arguments: { automationId: automation.id, status: "active" },
    })
    expect(active.structuredContent).toMatchObject({
      data: { status: "active" },
    })
    const foreign = await key(API_KEY_SCOPES, otherCookie)
    const otherClient = await mcp(foreign.token)
    const before = fixture.requests.length
    const denied = await otherClient.callTool({
      name: "delete_automation",
      arguments: { automationId: automation.id },
    })
    expect(denied.isError).toBe(true)
    expect(denied.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          error: { code: "not_found", message: "Automation was not found." },
        }),
      },
    ])
    expect(fixture.requests.length).toBe(before)
    const deleted = await client.callTool({
      name: "delete_automation",
      arguments: { automationId: automation.id },
    })
    expect(deleted.structuredContent).toEqual({ data: { success: true } })
  })

  it("keeps the 2025 MCP handshake working without session affinity", async () => {
    const read = await key(["workspace:read"])
    const headers = {
      authorization: `Bearer ${read.token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    }
    const initialized = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers,
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "legacy-client", version: "1.0.0" },
        },
      },
    })
    expect(initialized.statusCode).toBe(200)
    expect(rpcResponse(initialized).result.serverInfo.name).toBe("aghost")
    expect(initialized.headers["mcp-session-id"]).toBeUndefined()
    const listed = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: { ...headers, "mcp-protocol-version": "2025-11-25" },
      payload: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    })
    expect(listed.statusCode).toBe(200)
    expect(
      rpcResponse(listed).result.tools.map(
        (tool: { name: string }) => tool.name
      )
    ).toEqual(["get_workspace"])
    expect(listed.headers["cache-control"]).toContain("no-store")
    expect(
      (await app.inject({ method: "GET", url: "/api/mcp", headers })).statusCode
    ).toBe(405)
  })

  it("turns a valid key away over REST and MCP while its workspace has no plan", async () => {
    const created = await key(API_KEY_SCOPES)
    const client = await mcp(created.token)
    const before = fixture.requests.length
    expect(
      (
        await admin
          .from("workspace_billing")
          .update({ status: "cancelled" })
          .eq("workspace_id", workspaceId)
      ).error
    ).toBeNull()
    try {
      const refused = await rest(created.token, "/workspace")
      expect(refused.statusCode).toBe(402)
      expect(refused.json()).toEqual({
        error: {
          code: "plan_required",
          message: "Choose a plan to use this workspace.",
        },
      })
      expect(refused.headers["www-authenticate"]).toBeUndefined()
      for (const [path, method, body] of [
        ["/openapi.json", "GET", undefined],
        ["/automations", "POST", input()],
        [
          `/inbox/${account.id}/${encodeURIComponent(fixture.conversationId)}`,
          "POST",
          { text: "Not allowed" },
        ],
      ] as const) {
        expect((await rest(created.token, path, method, body)).statusCode).toBe(
          402
        )
      }
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/mcp",
            headers: {
              authorization: `Bearer ${created.token}`,
              "content-type": "application/json",
            },
            payload: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/list",
              params: {},
            },
          })
        ).statusCode
      ).toBe(402)
      await expect(
        client.callTool({ name: "get_workspace", arguments: {} })
      ).rejects.toThrow()
      expect((await session("/api-keys", "POST", {})).statusCode).toBe(402)
      expect(fixture.requests.length).toBe(before)
    } finally {
      await grantPlan(config, workspaceId, "growth")
    }
    expect((await rest(created.token, "/workspace")).statusCode).toBe(200)
    expect(
      (await client.callTool({ name: "get_workspace", arguments: {} })).isError
    ).not.toBe(true)
  })

  it("expires keys and revokes access on the next REST and MCP request", async () => {
    const created = await key(["workspace:read"])
    const client = await mcp(created.token)
    expect(
      (await session(`/api-keys/${created.key.id}`, "DELETE")).statusCode
    ).toBe(204)
    expect((await rest(created.token, "/workspace")).statusCode).toBe(401)
    await expect(
      client.callTool({ name: "get_workspace", arguments: {} })
    ).rejects.toThrow()
    const expiring = await key()
    expect(
      (
        await admin
          .from("api_keys")
          .update({ expires_at: "2020-01-01T00:00:00Z" })
          .eq("id", expiring.key.id)
      ).error
    ).toBeNull()
    expect((await rest(expiring.token, "/workspace")).statusCode).toBe(401)
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/mcp",
          headers: {
            authorization: `Bearer ${expiring.token}`,
            "content-type": "application/json",
          },
          payload: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
        })
      ).statusCode
    ).toBe(401)
  })
})
