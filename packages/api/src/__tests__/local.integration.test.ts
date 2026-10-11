import { createHmac, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import type { InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Webhook } from "standardwebhooks"
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
import { recordingAnalytics } from "./analytics-fixture"
import {
  grantPlan,
  signInDisposableUser,
  workspaceIdOf,
} from "./session-fixture"
import { startZernioFixture } from "./zernio-fixture"
import { dodoFixture } from "./dodo-fixture"

const config = {
  ...loadApiConfig(
    parseEnv(readFileSync(new URL("../../../../.env", import.meta.url), "utf8"))
  ),
  // Tests record events in memory, never in a PostHog project.
  posthog: null,
}
if (
  !["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname)
) {
  throw new Error("Integration tests may only use a local Supabase instance.")
}
const admin = createAdminSupabaseClient(config.supabase)
const runId = randomUUID()
const appOrigin = new URL(config.appUrl).origin
const eventIds: string[] = []
const userIds: string[] = []
const recorded = recordingAnalytics()

/** The Set-Cookie headers of a response, as they were sent. */
const setCookies = (response: LightMyRequestResponse) =>
  [response.headers["set-cookie"] ?? []].flat().map(String)

class ApiSession {
  readonly cookies = new Map<string, string>()
  constructor(private readonly app: ApiApp) {}
  async request(
    path: string,
    method: InjectOptions["method"] = "GET",
    body?: unknown,
    extraHeaders?: Record<string, string>
  ) {
    const response = await this.app.inject({
      method,
      url: `/api${path}`,
      headers: {
        origin: appOrigin,
        // Like the web client, a request names a JSON type only with a body.
        ...(body !== undefined && { "Content-Type": "application/json" }),
        cookie: [...this.cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
        ...extraHeaders,
      },
      ...(body !== undefined && { payload: JSON.stringify(body) }),
    })
    for (const cookie of setCookies(response)) {
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
  const dodo = dodoFixture()
  const dodoSecret = `whsec_${Buffer.from("fixture-billing-secret").toString("base64")}`

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
    expect(response.statusCode).toBe(201)
    return (await response.json()) as Automation
  }

  async function deliver(payload: Record<string, unknown>, signature?: string) {
    const body = JSON.stringify(payload)
    return app.inject({
      method: "POST",
      url: "/api/webhooks/zernio",
      headers: {
        "x-zernio-signature":
          signature ??
          createHmac("sha256", "fixture-webhook-secret")
            .update(body)
            .digest("hex"),
      },
      payload: body,
    })
  }

  const newEventId = () => {
    const id = `fixture-${runId}-${randomUUID()}`
    eventIds.push(id)
    return id
  }

  beforeAll(async () => {
    fixture = await startZernioFixture()
    app = createApi(
      {
        ...config,
        zernio: {
          apiUrl: fixture.apiUrl,
          apiKey: "fixture-api-key",
          webhookSecret: "fixture-webhook-secret",
        },
        dodo: {
          environment: "test_mode",
          apiKey: "fixture-dodo-key",
          webhookKey: dodoSecret,
        },
      },
      { dodo: dodo.client, analytics: recorded.analytics }
    )
    owner = new ApiSession(app)
    other = new ApiSession(app)
    for (const [index, session] of [owner, other].entries()) {
      const email = `aghost-fixture-${runId}-${index}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (error || !data.user)
        throw new Error("Could not create the disposable integration user")
      userIds.push(data.user.id)
      await signInDisposableUser(config, email, session.cookies)
      if (index === 0) ownerEmail = email
      const id = await workspaceIdOf(config, data.user.id)
      if (index === 0) workspaceId = id
      else otherWorkspaceId = id
    }
    const unpaid = await owner.request("/accounts/connect", "POST", {})
    expect(unpaid.statusCode).toBe(402)
    expect((await unpaid.json()).error.code).toBe("plan_required")
    await grantPlan(config, workspaceId, "growth")
    await grantPlan(config, otherWorkspaceId, "pro")
    expect(
      (await owner.request("/accounts/connect", "POST", {})).statusCode
    ).toBe(200)
    const workspace = await admin
      .from("workspaces")
      .select("zernio_profile_id")
      .eq("id", workspaceId)
      .single()
    if (!workspace.data?.zernio_profile_id)
      throw new Error("Fixture profile was not persisted")
    profileId = workspace.data.zernio_profile_id
    const synced = await owner.request("/accounts/sync", "POST", {})
    expect(synced.statusCode).toBe(200)
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

  it("returns a sign-in that did not complete to the login page", async () => {
    const visitor = new ApiSession(app)
    // Cancelled at Google, refused by Supabase, and a code nobody asked for.
    for (const query of ["", "?error=access_denied", "?code=not-a-code"]) {
      const callback = await visitor.request(`/auth/callback${query}`)
      expect(callback.statusCode).toBe(302)
      expect(callback.headers.location).toBe(`${appOrigin}/login?error=google`)
    }
    expect((await visitor.request("/auth/session")).statusCode).toBe(401)
    expect(recorded.people).toEqual([])
  })

  it("accepts Google as the only way to sign in", async () => {
    const settings = await fetch(`${config.supabase.url}/auth/v1/settings`, {
      headers: { apikey: config.supabase.publishableKey },
    })
    expect((await settings.json()).external).toMatchObject({
      google: true,
      email: false,
    })
    const credentials = {
      email: `aghost-email-${runId}@example.com`,
      password: `Fixture-${randomUUID()}`,
    }
    for (const path of ["/auth/sign-in", "/auth/sign-up"]) {
      expect(
        (await new ApiSession(app).request(path, "POST", credentials))
          .statusCode
      ).toBe(404)
    }
    // Supabase's own endpoints are public, so it refuses email there too.
    const supabase = createClient<Database>(
      config.supabase.url,
      config.supabase.publishableKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const signedUp = await supabase.auth.signUp(credentials)
    if (signedUp.data.user) userIds.push(signedUp.data.user.id)
    expect(signedUp.error?.code).toBe("email_provider_disabled")
    expect(
      (await supabase.auth.signInWithOtp({ email: ownerEmail })).error?.code
    ).toBe("email_provider_disabled")
  })

  it("reads the session from HttpOnly cookies and rejects unauthenticated or cross-origin requests", async () => {
    expect(await (await owner.request("/auth/session")).json()).toEqual({
      user: { id: userIds[0], email: ownerEmail },
    })
    expect((await new ApiSession(app).request("/workspace")).statusCode).toBe(
      401
    )
    expect(
      (
        await owner.request(
          "/workspace",
          "PATCH",
          { name: "Changed" },
          { origin: "https://foreign.example" }
        )
      ).statusCode
    ).toBe(400)
    expect(
      (
        await owner.request(
          "/workspace",
          "PATCH",
          { name: "Changed" },
          { "Content-Type": "text/plain" }
        )
      ).statusCode
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
    expect(recorded.namesFor(userIds[0]!).slice(0, 2)).toEqual([
      "instagram_connect_started",
      "instagram_account_connected",
    ])
    expect(
      (await other.request(`/accounts/${account.id}/posts`)).statusCode
    ).toBe(404)
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
    expect((await other.request(`/automations/${created.id}`)).statusCode).toBe(
      404
    )
    expect(
      (
        await other.request(`/automations/${created.id}/status`, "PATCH", {
          status: "paused",
        })
      ).statusCode
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
      ).statusCode
    ).toBe(422)
    const updated = await owner.request(`/automations/${created.id}`, "PATCH", {
      ...automationInput(),
      trigger: { postScope: "any_post" },
      dmButtons: [],
      commentReply: null,
      requireFollow: false,
      status: "paused",
    })
    expect(updated.statusCode).toBe(200)
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
      ).statusCode
    ).toBe(200)
    expect(
      (await owner.request(`/automations/${created.id}`, "DELETE")).statusCode
    ).toBe(204)
    expect((await owner.request(`/automations/${created.id}`)).statusCode).toBe(
      404
    )
    expect(fixture.automations.size).toBe(0)
    expect(
      recorded.events
        .filter(
          ({ event }) =>
            "automation_id" in event && event.automation_id === created.id
        )
        .map(({ source, actor, event }) => [source, actor, event.name])
    ).toEqual(
      [
        "automation_created",
        "automation_activated",
        "automation_updated",
        "automation_paused",
        "automation_activated",
        "automation_deleted",
      ].map((name) => ["dashboard", { userId: userIds[0], workspaceId }, name])
    )
    expect(
      recorded.events.find(
        ({ event }) =>
          event.name === "automation_created" &&
          event.automation_id === created.id
      )?.event
    ).toEqual({
      name: "automation_created",
      automation_id: created.id,
      status: "active",
      post_scope: "specific_post",
      match_mode: "word",
      keyword_count: 1,
      has_opening_dm: false,
      button_count: 1,
      has_comment_reply: true,
      requires_follow: true,
    })
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
    expect(response.statusCode).toBe(201)
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
      ).statusCode
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
    expect(cleared.statusCode).toBe(200)
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
      (await owner.request(`/automations/${created.id}`, "DELETE")).statusCode
    ).toBe(204)
  })

  it("lists the workspace's Instagram conversations and reads and replies only on its own threads", async () => {
    const inbox = await owner.request("/inbox")
    expect(inbox.statusCode).toBe(200)
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
      expect((await owner.request("/inbox")).statusCode).toBe(502)
    } finally {
      fixture.state.inboxAccountsFailed = 0
    }

    const thread = `/inbox/${account.id}/${encodeURIComponent(fixture.conversationId)}`
    const messages = await owner.request(thread)
    expect(messages.statusCode).toBe(200)
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
    expect((await other.request(thread)).statusCode).toBe(404)
    expect(
      (await other.request(thread, "POST", { text: "Hi" })).statusCode
    ).toBe(404)
    expect(fixture.requests.length).toBe(requestsBefore)
    const foreignThread = `/inbox/${account.id}/${fixture.foreignConversationId}`
    // Zernio's ids are opaque; a long one still reaches the ownership check.
    expect(
      (await owner.request(`/inbox/${account.id}/${"c".repeat(150)}`))
        .statusCode
    ).toBe(404)
    expect((await owner.request(foreignThread)).statusCode).toBe(404)
    expect(
      (await owner.request(foreignThread, "POST", { text: "Hi" })).statusCode
    ).toBe(404)
    expect(
      fixture.requests
        .slice(requestsBefore)
        .filter((request) => request.path.endsWith("/messages"))
    ).toEqual([])

    expect(
      (await owner.request(thread, "POST", { text: " " })).statusCode
    ).toBe(422)
    expect(
      (await owner.request(`/inbox/not-an-id/${fixture.foreignConversationId}`))
        .statusCode
    ).toBe(422)
    expect(
      (await owner.request(thread, "POST", { text: " Here you go " }))
        .statusCode
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
    expect(response.statusCode).toBe(200)
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
    expect((await owner.request("/contacts?offset=-1")).statusCode).toBe(422)
  })

  it("rejects a post that does not belong to the selected account before a provider write", async () => {
    const writesBefore = fixture.automations.size
    const response = await owner.request("/automations", "POST", {
      ...automationInput(),
      trigger: { postScope: "specific_post", platformPostId: "foreign-post" },
    })
    expect(response.statusCode).toBe(422)
    expect(fixture.automations.size).toBe(writesBefore)
  })

  it("maps provider conflicts and rate limits and preserves stored state on a failed write", async () => {
    for (const [providerStatus, expectedStatus] of [
      [409, 409],
      [429, 429],
    ]) {
      fixture.state.failureStatus = providerStatus!
      expect(
        (await owner.request("/automations", "POST", automationInput()))
          .statusCode
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
      ).statusCode
    ).toBe(502)
    expect(
      await (await owner.request(`/automations/${created.id}`)).json()
    ).toMatchObject({ status: "active" })
    await owner.request(`/automations/${created.id}`, "DELETE")
  })

  it("refuses provider account responses from another profile", async () => {
    fixture.state.outsideProfile = true
    try {
      expect(
        (await owner.request("/accounts/sync", "POST", {})).statusCode
      ).toBe(502)
      expect(await (await owner.request("/accounts")).json()).toEqual([account])
    } finally {
      fixture.state.outsideProfile = false
    }
  })

  it("enforces tenant reads and disallows client-side writes and webhook RPC execution", async () => {
    const session = await signInDisposableUser(config, ownerEmail, new Map())
    const user = createUserSupabaseClient(config.supabase, session.access_token)
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
      (await user.from("workspace_billing").select("workspace_id")).data
    ).toEqual([{ workspace_id: workspaceId }])
    expect(
      (
        await user
          .from("workspace_billing")
          .update({ plan: "business" })
          .eq("workspace_id", workspaceId)
      ).error?.code
    ).toBe("42501")
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

  it("prices plans in USD even for Indian visitors and reports the workspace's plan", async () => {
    const india = await other.request("/billing", "GET", undefined, {
      "x-visitor-country": "IN",
    })
    expect(await india.json()).toMatchObject({
      currency: "USD",
      subscription: { plan: "pro", currency: "USD" },
      connectedAccounts: 0,
    })
    expect(await (await owner.request("/billing")).json()).toMatchObject({
      currency: "USD",
      subscription: { plan: "growth", interval: "monthly", status: "active" },
      connectedAccounts: 1,
    })
  })

  it("fulfills a confirmed Dodo payment, limits concurrent connections, and pauses automations when billing ends", async () => {
    const email = `aghost-billing-${runId}@example.com`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !data.user)
      throw new Error("Could not create the disposable billing user")
    userIds.push(data.user.id)
    const customer = new ApiSession(app)
    await signInDisposableUser(config, email, customer.cookies)
    const workspace = { id: await workspaceIdOf(config, data.user.id) }
    // The paywall: until a plan is paid for, only billing answers.
    for (const [path, method, body] of [
      ["/workspace", "GET", undefined],
      ["/accounts", "GET", undefined],
      ["/automations", "GET", undefined],
      ["/inbox", "GET", undefined],
      ["/contacts", "GET", undefined],
      ["/api-keys", "POST", {}],
    ] as const) {
      const locked = await customer.request(path, method, body)
      expect(locked.statusCode).toBe(402)
      expect(await locked.json()).toEqual({
        error: {
          code: "plan_required",
          message: "Choose a plan to use this workspace.",
        },
      })
    }
    expect((await customer.request("/integrations")).statusCode).toBe(200)
    expect(
      await (
        await customer.request("/billing", "GET", undefined, {
          "x-visitor-country": "IN",
        })
      ).json()
    ).toEqual({ currency: "USD", subscription: null, connectedAccounts: 0 })
    const checkout = await customer.request(
      "/billing/checkout",
      "POST",
      { plan: "pro", interval: "monthly" },
      { "x-visitor-country": "IN" }
    )
    expect(checkout.statusCode).toBe(200)
    expect(await checkout.json()).toEqual({
      url: "https://checkout.example/session",
    })
    expect(
      dodo.requests.find((request) => request.path === "/customers")!.body
    ).toMatchObject({ email, metadata: { aghost_workspace_id: workspace.id } })
    dodo.state.subscription = dodo.subscription()

    async function billingEvent(type: string, signature?: string) {
      const body = JSON.stringify({
        type,
        data: { subscription_id: "sub_1", status: "active" },
      })
      const now = new Date()
      return app.inject({
        method: "POST",
        url: "/api/webhooks/dodo",
        headers: {
          "webhook-id": "billing_fixture",
          "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
          "webhook-signature":
            signature ??
            new Webhook(dodoSecret).sign("billing_fixture", now, body),
        },
        payload: body,
      })
    }

    expect(
      (await billingEvent("subscription.active", "v1,forged")).statusCode
    ).toBe(401)
    expect((await billingEvent("subscription.active")).statusCode).toBe(200)
    expect(
      (await (await customer.request("/billing")).json()).subscription.status
    ).toBe("pending")
    expect(
      (await customer.request("/accounts/connect", "POST", {})).statusCode
    ).toBe(402)
    dodo.state.payments = [dodo.payment()]
    expect((await billingEvent("payment.succeeded")).statusCode).toBe(200)
    expect(
      (await (await customer.request("/billing")).json()).subscription.status
    ).toBe("active")
    expect((await customer.request("/workspace")).statusCode).toBe(200)
    expect(
      (
        await customer.request("/billing/checkout", "POST", {
          plan: "growth",
          interval: "monthly",
        })
      ).statusCode
    ).toBe(409)

    dodo.state.paymentLink = "https://checkout.example/approval"
    const approval = await customer.request("/billing/plan", "POST", {
      plan: "growth",
      interval: "monthly",
    })
    expect(approval.statusCode).toBe(200)
    expect(await approval.json()).toMatchObject({
      paymentUrl: dodo.state.paymentLink,
      state: { subscription: { plan: "pro" } },
    })
    dodo.state.subscription = dodo.subscription({
      product_id: "pdt_growth_monthly",
    })
    dodo.state.payments = [dodo.payment({ total_amount: 1900 })]
    expect((await billingEvent("subscription.plan_changed")).statusCode).toBe(
      200
    )
    expect(
      (await customer.request("/accounts/connect", "POST", {})).statusCode
    ).toBe(200)
    const profile = (
      await admin
        .from("workspaces")
        .select("zernio_profile_id")
        .eq("id", workspace.id)
        .single()
    ).data!.zernio_profile_id!

    const connected = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        deliver({
          id: newEventId(),
          event: "account.connected",
          account: {
            accountId: `billing-account-${runId}-${index}`,
            profileId: profile,
            platform: "instagram",
            username: `billing_${index}`,
          },
        })
      )
    )
    expect(connected.every((response) => response.statusCode === 200)).toBe(
      true
    )
    const accounts = (await (
      await customer.request("/accounts")
    ).json()) as InstagramAccount[]
    expect(
      accounts.filter((account) => account.status === "connected")
    ).toHaveLength(2)
    expect(
      accounts.filter((account) => account.status === "disconnected")
    ).toHaveLength(1)
    expect(
      (await customer.request("/accounts/connect", "POST", {})).statusCode
    ).toBe(403)
    // A refused connection is an upgrade signal, before any account exists.
    expect(
      recorded.events
        .filter(
          ({ actor, event }) =>
            actor.userId === data.user!.id &&
            event.name === "instagram_account_limit_reached"
        )
        .at(-1)?.event
    ).toEqual({ name: "instagram_account_limit_reached", account_id: null })
    expect(
      (
        await customer.request("/billing/plan", "POST", {
          plan: "pro",
          interval: "monthly",
        })
      ).statusCode
    ).toBe(403)
    const automation = await customer.request("/automations", "POST", {
      ...automationInput(),
      instagramAccountId: accounts.find(
        (account) => account.status === "connected"
      )!.id,
      trigger: { postScope: "any_post" },
    })
    expect(automation.statusCode).toBe(201)
    const created = (await automation.json()) as Automation

    dodo.state.subscription = dodo.subscription({
      product_id: "pdt_growth_monthly",
      status: "on_hold",
    })
    expect((await billingEvent("subscription.on_hold")).statusCode).toBe(200)
    expect(
      (
        await admin
          .from("automations")
          .select("status")
          .eq("id", created.id)
          .single()
      ).data?.status
    ).toBe("paused")
    // Locked out again, from the workspace's own automations too.
    expect((await customer.request("/workspace")).statusCode).toBe(402)
    expect(
      (await customer.request(`/automations/${created.id}`)).statusCode
    ).toBe(402)
    expect(
      (
        await customer.request(`/automations/${created.id}/status`, "PATCH", {
          status: "active",
        })
      ).statusCode
    ).toBe(402)
    // A delayed old "active" delivery reads the provider's current on-hold state.
    expect((await billingEvent("subscription.active")).statusCode).toBe(200)
    expect(
      (await (await customer.request("/billing")).json()).subscription.status
    ).toBe("on_hold")
    expect(
      (await customer.request("/billing/portal", "POST", {})).statusCode
    ).toBe(200)

    // Paying again reopens the workspace; its automations stay paused.
    dodo.state.subscription = dodo.subscription({
      product_id: "pdt_growth_monthly",
    })
    expect((await billingEvent("subscription.active")).statusCode).toBe(200)
    expect(
      (await (await customer.request(`/automations/${created.id}`)).json())
        .status
    ).toBe("paused")
    expect(
      (await customer.request(`/automations/${created.id}`, "DELETE"))
        .statusCode
    ).toBe(204)
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
    expect(responses.every((response) => response.statusCode === 200)).toBe(
      true
    )
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
    expect((await other.request("/accounts/sync", "POST", {})).statusCode).toBe(
      409
    )
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
    expect((await deliver(payload, `${signature}junk`)).statusCode).toBe(401)
    expect(
      (await admin.from("webhook_events").select("id").eq("id", payload.id))
        .data
    ).toEqual([])
  })

  it("creates a new user's workspace and clears the session on sign-out", async () => {
    const session = new ApiSession(app)
    const email = `aghost-new-${runId}@example.com`
    const { data } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (!data.user) throw new Error("Could not create the disposable user")
    userIds.push(data.user.id)
    await signInDisposableUser(config, email, session.cookies)
    expect((await session.request("/billing")).statusCode).toBe(200)
    const signedOut = await session.request("/auth/sign-out", "POST", {})
    expect(signedOut.statusCode).toBe(204)
    const cleared = setCookies(signedOut)
    expect(cleared.length).toBeGreaterThan(0)
    expect(cleared.every((value) => /HttpOnly/i.test(value))).toBe(true)
    expect(session.cookies.size).toBe(0)
    expect((await session.request("/auth/session")).statusCode).toBe(401)
  })

  it("blocks activation while disconnected and removes dependent automations before disconnecting", async () => {
    const before = recorded.events.length
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
      ).statusCode
    ).toBe(409)
    expect(
      (
        await owner.request(`/automations/${created.id}/status`, "PATCH", {
          status: "paused",
        })
      ).statusCode
    ).toBe(200)
    expect(
      (await owner.request(`/accounts/${account.id}`, "DELETE")).statusCode
    ).toBe(204)
    expect((await owner.request(`/automations/${created.id}`)).statusCode).toBe(
      404
    )
    expect(fixture.automations.size).toBe(0)
    const writes = fixture.requests.filter(
      (request) => request.method === "DELETE"
    )
    expect(writes.at(-2)?.path).toContain("/v1/comment-automations/")
    expect(writes.at(-1)?.path).toBe(`/v1/accounts/${fixture.accountId}`)
    expect(
      recorded.events
        .slice(before)
        .map(({ source, event }) => [source, event.name])
    ).toEqual([
      ["dashboard", "automation_created"],
      ["dashboard", "automation_activated"],
      ["webhook", "instagram_account_disconnected"],
      ["dashboard", "automation_paused"],
      ["dashboard", "automation_deleted"],
      ["dashboard", "instagram_account_removed"],
    ])
    expect(recorded.events.slice(before)[2]!.event).toMatchObject({
      account_id: account.id,
      reason: "Access revoked",
    })
  })

  it("reports the missing provider integration explicitly without contacting Zernio", async () => {
    const disabled = new ApiSession(
      createApi({
        ...config,
        zernio: { ...config.zernio, apiKey: "", webhookSecret: "" },
        dodo: { ...config.dodo, apiKey: "", webhookKey: "" },
      })
    )
    for (const [name, value] of owner.cookies) disabled.cookies.set(name, value)
    expect(await (await disabled.request("/integrations")).json()).toEqual({
      instagramConfigured: false,
      billingConfigured: false,
    })
    expect(
      (await disabled.request("/billing/portal", "POST", {})).statusCode
    ).toBe(503)
    expect(
      (await disabled.request("/webhooks/dodo", "POST", {})).statusCode
    ).toBe(503)
    expect(
      (await disabled.request("/accounts/connect", "POST", {})).statusCode
    ).toBe(503)
    expect(
      (await disabled.request("/webhooks/zernio", "POST", {})).statusCode
    ).toBe(503)
  })
})
