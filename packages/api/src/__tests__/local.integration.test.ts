import { createHmac, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@supabase/supabase-js"
import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
} from "@workspace/supabase/server"
import type { Database } from "@workspace/supabase/types"
import { loadApiConfig } from "../config"
import { createApi } from "../container"
import type { ApiApp } from "../http/app"
import type { Automation, CreateAutomationInput } from "../contract/automation"
import type { InstagramAccount } from "../contract/account"
import { startZernioFixture } from "./zernio-fixture"

const config = loadApiConfig(
  parseEnv(readFileSync(new URL("../../../../.env", import.meta.url), "utf8"))
)
if (
  !["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname)
) {
  throw new Error("Integration tests may only use a local Supabase instance.")
}
const admin = createAdminSupabaseClient(config.supabase)
const runId = randomUUID()
const password = `Fixture-${randomUUID()}`
const eventIds: string[] = []
const userIds: string[] = []

class ApiSession {
  readonly cookies = new Map<string, string>()
  constructor(private readonly app: ApiApp) {}
  async request(
    path: string,
    method = "GET",
    body?: unknown,
    extraHeaders?: Record<string, string>
  ) {
    const response = await this.app.request(`/api${path}`, {
      method,
      headers: {
        origin: new URL(config.appUrl).origin,
        "Content-Type": "application/json",
        cookie: [...this.cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
        ...extraHeaders,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";")
      const index = pair!.indexOf("=")
      const name = pair!.slice(0, index)
      const value = pair!.slice(index + 1)
      if (/Max-Age=0/i.test(cookie)) this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
    return response
  }
}

describe("local API, provider SDK, and PostgreSQL integration", () => {
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let app: ApiApp
  let owner: ApiSession
  let other: ApiSession
  let ownerEmail: string
  let account: InstagramAccount
  let workspaceId: string
  let otherWorkspaceId: string
  let profileId: string

  const automationInput = (): CreateAutomationInput => ({
    instagramAccountId: account.id,
    name: "Guide automation",
    status: "active",
    trigger: { postScope: "specific_post", platformPostId: fixture.postId },
    keywords: [" Guide ", "GUIDE"],
    matchMode: "word",
    openingDm: null,
    dmMessage: "Hi {{first_name}}, here's the guide.",
    dmButtons: [{ label: "Get the guide", url: "https://example.com/guide" }],
    commentReply: "Sent you a DM!",
    requireFollow: true,
  })

  async function createAutomation() {
    const response = await owner.request(
      "/automations",
      "POST",
      automationInput()
    )
    expect(response.status).toBe(201)
    return (await response.json()) as Automation
  }

  async function deliver(payload: Record<string, unknown>, signature?: string) {
    const body = JSON.stringify(payload)
    return app.request("/api/webhooks/zernio", {
      method: "POST",
      headers: {
        "x-zernio-signature":
          signature ??
          createHmac("sha256", "fixture-webhook-secret")
            .update(body)
            .digest("hex"),
      },
      body,
    })
  }

  const newEventId = () => {
    const id = `fixture-${runId}-${randomUUID()}`
    eventIds.push(id)
    return id
  }

  beforeAll(async () => {
    fixture = await startZernioFixture()
    app = createApi({
      ...config,
      zernio: {
        apiUrl: fixture.apiUrl,
        apiKey: "fixture-api-key",
        webhookSecret: "fixture-webhook-secret",
      },
    })
    owner = new ApiSession(app)
    other = new ApiSession(app)
    for (const [index, session] of [owner, other].entries()) {
      const email = `aghost-fixture-${runId}-${index}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error || !data.user)
        throw new Error("Could not create the disposable integration user")
      userIds.push(data.user.id)
      const signedIn = await session.request("/auth/sign-in", "POST", {
        email,
        password,
      })
      expect(signedIn.status).toBe(200)
      if (index === 0) ownerEmail = email
      const workspace = await (await session.request("/workspace")).json()
      if (index === 0) workspaceId = workspace.id
      else otherWorkspaceId = workspace.id
    }
    expect((await owner.request("/accounts/connect", "POST", {})).status).toBe(
      200
    )
    const workspace = await admin
      .from("workspaces")
      .select("zernio_profile_id")
      .eq("id", workspaceId)
      .single()
    if (!workspace.data?.zernio_profile_id)
      throw new Error("Fixture profile was not persisted")
    profileId = workspace.data.zernio_profile_id
    const synced = await owner.request("/accounts/sync", "POST", {})
    expect(synced.status).toBe(200)
    account = (await synced.json())[0]
  })

  afterAll(async () => {
    const errors: string[] = []
    if (eventIds.length) {
      const { error } = await admin
        .from("webhook_events")
        .delete()
        .in("id", eventIds)
      if (error) errors.push("webhook cleanup")
    }
    for (const id of userIds) {
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) errors.push("user cleanup")
    }
    await fixture?.close()
    if (errors.length)
      throw new Error(`Fixture cleanup failed: ${errors.join(", ")}`)
  })

  it("uses HttpOnly session cookies and rejects unauthenticated or cross-origin requests", async () => {
    const signedIn = await owner.request("/auth/sign-in", "POST", {
      email: ownerEmail,
      password,
    })
    const cookies = signedIn.headers.getSetCookie()
    expect(cookies.length).toBeGreaterThan(0)
    expect(
      cookies.every(
        (value) => /HttpOnly/i.test(value) && /SameSite=Lax/i.test(value)
      )
    ).toBe(true)
    expect(await signedIn.json()).toEqual({
      user: { id: userIds[0], email: ownerEmail },
    })
    expect(signedIn.headers.get("Cache-Control")).toContain("no-store")
    expect((await new ApiSession(app).request("/workspace")).status).toBe(401)
    expect(
      (
        await owner.request(
          "/workspace",
          "PATCH",
          { name: "Changed" },
          { origin: "https://foreign.example" }
        )
      ).status
    ).toBe(400)
    expect(
      (
        await owner.request(
          "/workspace",
          "PATCH",
          { name: "Changed" },
          { "Content-Type": "text/plain" }
        )
      ).status
    ).toBe(400)
  })

  it("builds the Instagram OAuth URL with messaging scopes and persists a verified account", async () => {
    const connect = fixture.requests.find(
      (request) => request.path === "/v1/connect/instagram"
    )!
    expect(connect.query.get("profileId")).toBe(profileId)
    expect(connect.query.get("scopes")).toBe("comments,messaging")
    expect(connect.query.get("redirect_url")).toBe(
      `${new URL(config.appUrl).origin}/accounts/callback`
    )
    expect(account).toMatchObject({
      username: "fixture_creator",
      status: "connected",
    })
    expect(account).not.toHaveProperty("providerAccountId")
    expect((await other.request(`/accounts/${account.id}/posts`)).status).toBe(
      404
    )
    expect(await (await other.request("/accounts")).json()).toEqual([])
  })

  it("creates, reads, edits, pauses, and deletes an automation through the real provider SDK", async () => {
    const created = await createAutomation()
    expect(created).toMatchObject({
      status: "active",
      keywords: ["Guide"],
      trigger: {
        postScope: "specific_post",
        post: { platformPostId: fixture.postId, caption: "Comment GUIDE" },
      },
    })
    expect(created).not.toHaveProperty("providerAutomationId")
    const remote = [...fixture.automations.values()][0]!
    expect(remote).toMatchObject({
      accountId: fixture.accountId,
      profileId,
      isActive: true,
      audience: { followerStatus: "follower", whenUnknown: "verify" },
      buttons: [
        {
          type: "url",
          title: "Get the guide",
          url: "https://example.com/guide",
        },
      ],
    })
    expect((await other.request(`/automations/${created.id}`)).status).toBe(404)
    expect(
      (
        await other.request(`/automations/${created.id}/status`, "PATCH", {
          status: "paused",
        })
      ).status
    ).toBe(404)
    const stats = await (await owner.request("/automations/stats")).json()
    expect(stats[created.id]).toMatchObject({
      dmsSent: 12,
      linkClicks: 3,
      triggered: null,
      trackedSends: null,
    })
    const activity = await (
      await owner.request(
        `/automations/${created.id}/activity?limit=25&offset=0`
      )
    ).json()
    expect(activity).toMatchObject({
      total: 1,
      hasMore: false,
      entries: [{ dmStatus: "sent", linkClicks: 1 }],
    })
    expect(
      (
        await owner.request(
          `/automations/${created.id}/activity?limit=51&offset=-1`
        )
      ).status
    ).toBe(422)
    const updated = await owner.request(`/automations/${created.id}`, "PATCH", {
      ...automationInput(),
      trigger: { postScope: "any_post" },
      dmButtons: [],
      commentReply: null,
      requireFollow: false,
      status: "paused",
    })
    expect(updated.status).toBe(200)
    expect(await updated.json()).toMatchObject({
      status: "paused",
      trigger: { postScope: "any_post" },
    })
    expect(fixture.automations.get(String(remote.id))).toMatchObject({
      isActive: false,
      platformPostId: null,
      postId: null,
      postTitle: null,
      buttons: [],
      commentReply: "",
      audience: { followerStatus: "any", whenUnknown: "send" },
    })
    expect(
      (
        await owner.request(`/automations/${created.id}/status`, "PATCH", {
          status: "active",
        })
      ).status
    ).toBe(200)
    expect(
      (await owner.request(`/automations/${created.id}`, "DELETE")).status
    ).toBe(204)
    expect((await owner.request(`/automations/${created.id}`)).status).toBe(404)
    expect(fixture.automations.size).toBe(0)
  })

  it("sends an opening DM through Zernio's tap-to-unlock and fully removes it again", async () => {
    const openingDm = {
      message: "Tap below and I'll send the guide.",
      buttonLabel: "Send it",
    }
    const config = {
      ...automationInput(),
      trigger: { postScope: "any_post" },
      requireFollow: false,
    }
    const lastWrite = (method: string) =>
      fixture.requests
        .filter(
          (request) =>
            request.method === method &&
            request.path.startsWith("/v1/comment-automations")
        )
        .at(-1)!.body
    const response = await owner.request("/automations", "POST", {
      ...config,
      openingDm: { message: ` ${openingDm.message} `, buttonLabel: "Send it" },
    })
    expect(response.status).toBe(201)
    const created = (await response.json()) as Automation
    expect(created.openingDm).toEqual(openingDm)
    expect(lastWrite("POST")).toMatchObject({
      audience: { followerStatus: "any", tapToUnlock: true },
      followGate: openingDm,
    })
    // Zernio refuses tap-to-unlock with a follower rule, so the opening DM
    // becomes the follow confirmation instead.
    expect(
      (
        await owner.request(`/automations/${created.id}`, "PATCH", {
          ...config,
          openingDm,
          requireFollow: true,
        })
      ).status
    ).toBe(200)
    expect(lastWrite("PATCH")).toMatchObject({
      audience: { followerStatus: "follower", whenUnknown: "verify" },
      followGate: openingDm,
    })
    expect(lastWrite("PATCH").audience).not.toHaveProperty("tapToUnlock")
    const cleared = await owner.request(`/automations/${created.id}`, "PATCH", {
      ...config,
      openingDm: null,
    })
    expect(cleared.status).toBe(200)
    expect((await cleared.json()).openingDm).toBeNull()
    expect(lastWrite("PATCH")).toMatchObject({
      audience: { followerStatus: "any", whenUnknown: "send" },
      followGate: { message: "", buttonLabel: "" },
    })
    expect(lastWrite("PATCH").audience).not.toHaveProperty("tapToUnlock")
    expect(
      (await (await owner.request(`/automations/${created.id}`)).json())
        .openingDm
    ).toBeNull()
    expect(
      (
        await admin
          .from("automations")
          .update({ opening_dm_message: "Only half" })
          .eq("id", created.id)
      ).error?.code
    ).toBe("23514")
    expect(
      (await owner.request(`/automations/${created.id}`, "DELETE")).status
    ).toBe(204)
  })

  it("lists the workspace's Instagram conversations and reads and replies only on its own threads", async () => {
    const inbox = await owner.request("/inbox")
    expect(inbox.status).toBe(200)
    expect(await inbox.json()).toEqual([
      {
        id: fixture.conversationId,
        instagramAccountId: account.id,
        participant: {
          name: "Ann Reader",
          avatarUrl: "https://example.com/ann.jpg",
        },
        lastMessage: "Thanks!",
        unreadCount: 2,
        updatedAt: "2026-10-09T12:00:00Z",
        url: "https://ig.me/fixture",
      },
    ])
    const listed = fixture.requests
      .filter((request) => request.path === "/v1/inbox/conversations")
      .at(-1)!
    expect(Object.fromEntries(listed.query)).toMatchObject({
      profileId,
      platform: "instagram",
      sortOrder: "desc",
    })
    fixture.state.inboxAccountsFailed = 1
    try {
      expect((await owner.request("/inbox")).status).toBe(502)
    } finally {
      fixture.state.inboxAccountsFailed = 0
    }

    const thread = `/inbox/${account.id}/${encodeURIComponent(fixture.conversationId)}`
    const messages = await owner.request(thread)
    expect(messages.status).toBe(200)
    expect(await messages.json()).toEqual([
      {
        id: "fixture-message-1",
        direction: "incoming",
        text: "GUIDE please",
        attachments: [],
        createdAt: "2026-10-09T11:58:00Z",
      },
      {
        id: "fixture-message-2",
        direction: "outgoing",
        text: null,
        attachments: [{ type: "image", url: "https://example.com/guide.png" }],
        createdAt: "2026-10-09T11:59:00Z",
      },
      {
        id: "fixture-message-3",
        direction: "incoming",
        text: "Thanks!",
        attachments: [],
        createdAt: "2026-10-09T12:00:00Z",
      },
    ])

    // Another workspace cannot use the account, and the account cannot reach
    // a thread it does not hold, although Zernio answers for both.
    const requestsBefore = fixture.requests.length
    expect(await (await other.request("/inbox")).json()).toEqual([])
    expect((await other.request(thread)).status).toBe(404)
    expect((await other.request(thread, "POST", { text: "Hi" })).status).toBe(
      404
    )
    expect(fixture.requests.length).toBe(requestsBefore)
    const foreignThread = `/inbox/${account.id}/${fixture.foreignConversationId}`
    expect((await owner.request(foreignThread)).status).toBe(404)
    expect(
      (await owner.request(foreignThread, "POST", { text: "Hi" })).status
    ).toBe(404)
    expect(
      fixture.requests
        .slice(requestsBefore)
        .filter((request) => request.path.endsWith("/messages"))
    ).toEqual([])

    expect((await owner.request(thread, "POST", { text: " " })).status).toBe(
      422
    )
    expect(
      (await owner.request(`/inbox/not-an-id/${fixture.foreignConversationId}`))
        .status
    ).toBe(422)
    expect(
      (await owner.request(thread, "POST", { text: " Here you go " })).status
    ).toBe(204)
    expect(fixture.requests.at(-1)).toMatchObject({
      method: "POST",
      body: { accountId: fixture.accountId, message: "Here you go" },
    })
    expect((await (await owner.request(thread)).json()).at(-1)).toMatchObject({
      direction: "outgoing",
      text: "Here you go",
    })
  })

  it("lists the workspace's Instagram contacts a page at a time", async () => {
    const response = await owner.request("/contacts?search=ann&offset=50")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      contacts: [
        {
          id: "fixture-contact-1",
          name: "Ann Reader",
          username: "ann.reader",
          avatarUrl: null,
          tags: ["guide"],
          lastMessageAt: "2026-10-09T12:05:00Z",
          createdAt: "2026-10-01T09:00:00Z",
        },
        {
          id: "fixture-contact-2",
          name: "Ben",
          username: "ben",
          avatarUrl: "https://example.com/ben.jpg",
          tags: [],
          lastMessageAt: "2026-10-08T08:00:00Z",
          createdAt: "2026-10-02T09:00:00Z",
        },
      ],
      total: 52,
      hasMore: false,
    })
    const listed = fixture.requests
      .filter((request) => request.path === "/v1/contacts")
      .at(-1)!
    expect(Object.fromEntries(listed.query)).toEqual({
      profileId,
      platform: "instagram",
      search: "ann",
      limit: "50",
      skip: "50",
    })
    expect(await (await other.request("/contacts")).json()).toEqual({
      contacts: [],
      total: 0,
      hasMore: false,
    })
    expect((await owner.request("/contacts?offset=-1")).status).toBe(422)
  })

  it("rejects a post that does not belong to the selected account before a provider write", async () => {
    const writesBefore = fixture.automations.size
    const response = await owner.request("/automations", "POST", {
      ...automationInput(),
      trigger: { postScope: "specific_post", platformPostId: "foreign-post" },
    })
    expect(response.status).toBe(422)
    expect(fixture.automations.size).toBe(writesBefore)
  })

  it("maps provider conflicts and rate limits and preserves stored state on a failed write", async () => {
    for (const [providerStatus, expectedStatus] of [
      [409, 409],
      [429, 429],
    ]) {
      fixture.state.failureStatus = providerStatus!
      expect(
        (await owner.request("/automations", "POST", automationInput())).status
      ).toBe(expectedStatus)
    }
    expect(await (await owner.request("/automations")).json()).toEqual([])
    const created = await createAutomation()
    fixture.state.failureStatus = 503
    expect(
      (
        await owner.request(`/automations/${created.id}/status`, "PATCH", {
          status: "paused",
        })
      ).status
    ).toBe(502)
    expect(
      await (await owner.request(`/automations/${created.id}`)).json()
    ).toMatchObject({ status: "active" })
    await owner.request(`/automations/${created.id}`, "DELETE")
  })

  it("refuses provider account responses from another profile", async () => {
    fixture.state.outsideProfile = true
    try {
      expect((await owner.request("/accounts/sync", "POST", {})).status).toBe(
        502
      )
      expect(await (await owner.request("/accounts")).json()).toEqual([account])
    } finally {
      fixture.state.outsideProfile = false
    }
  })

  it("enforces tenant reads and disallows client-side writes and webhook RPC execution", async () => {
    const auth = createClient<Database>(
      config.supabase.url,
      config.supabase.publishableKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data, error } = await auth.auth.signInWithPassword({
      email: ownerEmail,
      password,
    })
    expect(error).toBeNull()
    const user = createUserSupabaseClient(
      config.supabase,
      data.session!.access_token
    )
    expect((await user.from("workspaces").select("id")).data).toEqual([
      { id: workspaceId },
    ])
    expect(
      (
        await user
          .from("workspaces")
          .update({ zernio_profile_id: "forged" })
          .eq("id", workspaceId)
      ).error?.code
    ).toBe("42501")
    expect(
      (
        await user.from("instagram_accounts").insert({
          workspace_id: workspaceId,
          zernio_account_id: "forged",
          username: "forged",
          status: "connected",
        })
      ).error?.code
    ).toBe("42501")
    expect((await user.from("webhook_events").select()).error?.code).toBe(
      "42501"
    )
    expect(
      (
        await user.rpc("process_account_webhook", {
          p_id: "forged",
          p_type: "account.connected",
          p_kind: "unhandled",
          p_account: {},
          p_payload: {},
        })
      ).error?.code
    ).toBe("42501")
  })

  it("commits concurrent duplicate webhook deliveries once", async () => {
    const id = newEventId()
    const payload = {
      id,
      event: "account.connected",
      account: {
        accountId: `fixture-hook-${runId}`,
        profileId,
        platform: "instagram",
        username: "webhook_creator",
      },
    }
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => deliver(payload))
    )
    expect(responses.every((response) => response.status === 200)).toBe(true)
    const receipts = await Promise.all(
      responses.map((response) => response.json())
    )
    expect(
      receipts.filter((result) => result.receipt === "processed")
    ).toHaveLength(1)
    expect(
      receipts.filter((result) => result.receipt === "duplicate")
    ).toHaveLength(5)
    expect(
      (
        await admin
          .from("instagram_accounts")
          .select("id")
          .eq("zernio_account_id", `fixture-hook-${runId}`)
      ).data
    ).toHaveLength(1)
    expect(
      (
        await admin
          .from("webhook_events")
          .select("status,processed_at")
          .eq("id", id)
          .single()
      ).data
    ).toMatchObject({ status: "processed", processed_at: expect.any(String) })
  })

  it("rolls back the webhook ledger when its account mutation fails, allowing a retry", async () => {
    const id = newEventId()
    const rpcInput = {
      p_id: id,
      p_type: "account.connected",
      p_kind: "account_connected",
      p_payload: {},
      p_account: {
        providerAccountId: `fixture-retry-${runId}`,
        providerProfileId: profileId,
        platform: "instagram",
      },
    }
    expect(
      (await admin.rpc("process_account_webhook", rpcInput)).error?.code
    ).toBe("23502")
    expect(
      (await admin.from("webhook_events").select("id").eq("id", id)).data
    ).toEqual([])
    expect(
      (
        await admin.rpc("process_account_webhook", {
          ...rpcInput,
          p_account: { ...rpcInput.p_account, username: "retry_creator" },
        })
      ).data
    ).toBe("processed")
  })

  it("does not move an existing account to another workspace through a webhook or account sync", async () => {
    const foreignProfile = `fixture-other-${runId}`
    expect(
      (
        await admin
          .from("workspaces")
          .update({ zernio_profile_id: foreignProfile })
          .eq("id", otherWorkspaceId)
      ).error
    ).toBeNull()
    const response = await deliver({
      id: newEventId(),
      event: "account.connected",
      account: {
        accountId: fixture.accountId,
        profileId: foreignProfile,
        platform: "instagram",
        username: "foreign_creator",
      },
    })
    expect(await response.json()).toEqual({ receipt: "ignored" })
    expect((await other.request("/accounts/sync", "POST", {})).status).toBe(409)
    expect(
      (
        await admin
          .from("instagram_accounts")
          .select("workspace_id,username")
          .eq("id", account.id)
          .single()
      ).data
    ).toEqual({ workspace_id: workspaceId, username: "fixture_creator" })
    expect(
      (
        await admin.from("automations").insert({
          workspace_id: otherWorkspaceId,
          instagram_account_id: account.id,
          zernio_automation_id: `fixture-forged-${runId}`,
          name: "Forged",
          status: "paused",
          post_scope: "any_post",
          match_mode: "word",
          dm_message: "Forged",
        })
      ).error?.code
    ).toBe("23503")
  })

  it("ignores samples and unrelated events, and rejects a signature with an appended suffix", async () => {
    for (const payload of [
      { id: newEventId(), event: "account.connected", test: true },
      { id: newEventId(), event: "post.published" },
    ]) {
      expect(await (await deliver(payload)).json()).toEqual({
        receipt: "ignored",
      })
    }
    const payload = { id: newEventId(), event: "post.published" }
    const signature = createHmac("sha256", "fixture-webhook-secret")
      .update(JSON.stringify(payload))
      .digest("hex")
    expect((await deliver(payload, `${signature}junk`)).status).toBe(401)
    expect(
      (await admin.from("webhook_events").select("id").eq("id", payload.id))
        .data
    ).toEqual([])
  })

  it("signs up a user, creates their workspace, and clears the session on sign-out", async () => {
    const session = new ApiSession(app)
    const email = `aghost-signup-${runId}@example.com`
    const response = await session.request("/auth/sign-up", "POST", {
      email,
      password,
    })
    expect(response.status).toBe(201)
    const result = await response.json()
    if (result.user) userIds.push(result.user.id)
    expect(result.needsConfirmation).toBe(false)
    expect((await session.request("/workspace")).status).toBe(200)
    expect((await session.request("/auth/sign-out", "POST", {})).status).toBe(
      204
    )
    expect((await session.request("/auth/session")).status).toBe(401)
  })

  it("blocks activation while disconnected and removes dependent automations before disconnecting", async () => {
    const created = await createAutomation()
    const disconnected = await deliver({
      id: newEventId(),
      event: "account.disconnected",
      account: {
        accountId: fixture.accountId,
        profileId,
        platform: "instagram",
        username: "fixture_creator",
        reason: "Access revoked",
      },
    })
    expect(await disconnected.json()).toEqual({ receipt: "processed" })
    expect(
      (
        await owner.request(`/automations/${created.id}/status`, "PATCH", {
          status: "active",
        })
      ).status
    ).toBe(409)
    expect(
      (
        await owner.request(`/automations/${created.id}/status`, "PATCH", {
          status: "paused",
        })
      ).status
    ).toBe(200)
    expect(
      (await owner.request(`/accounts/${account.id}`, "DELETE")).status
    ).toBe(204)
    expect((await owner.request(`/automations/${created.id}`)).status).toBe(404)
    expect(fixture.automations.size).toBe(0)
    const writes = fixture.requests.filter(
      (request) => request.method === "DELETE"
    )
    expect(writes.at(-2)?.path).toContain("/v1/comment-automations/")
    expect(writes.at(-1)?.path).toBe(`/v1/accounts/${fixture.accountId}`)
  })

  it("reports the missing provider integration explicitly without contacting Zernio", async () => {
    const disabled = new ApiSession(
      createApi({
        ...config,
        zernio: { ...config.zernio, apiKey: "", webhookSecret: "" },
      })
    )
    for (const [name, value] of owner.cookies) disabled.cookies.set(name, value)
    expect(await (await disabled.request("/integrations")).json()).toEqual({
      instagramConfigured: false,
    })
    expect(
      (await disabled.request("/accounts/connect", "POST", {})).status
    ).toBe(503)
    expect(
      (await disabled.request("/webhooks/zernio", "POST", {})).status
    ).toBe(503)
  })
})
