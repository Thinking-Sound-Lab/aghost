import { createHmac, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createClient } from "@supabase/supabase-js"
import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
} from "@workspace/supabase/server"
import { createApi } from "../container"
import { loadApiConfig } from "../config"
import type { Automation, CreateAutomationInput } from "../contract/automation"
import type { ScheduledPost } from "../contract/post"
import type { ApiApp } from "../http/app"
import { createZernioClient } from "../infrastructure/zernio/zernio-client"
import { ZernioFollowUpProvider } from "../infrastructure/zernio/zernio-follow-up.provider"
import { SupabaseFollowUpRepository } from "../infrastructure/supabase/supabase-follow-up.repository"
import { SupabaseWorkspaceOperations } from "../infrastructure/supabase/supabase-workspace-operations"
import { FollowUpService } from "../modules/automations/follow-up.service"
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
  posthog: null,
}
if (!["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname))
  throw new Error("Feature tests require local Supabase.")
const admin = createAdminSupabaseClient(config.supabase)
const card = {
  title: "Creator kit",
  subtitle: "$29",
  imageUrl: "https://example.com/kit.jpg",
  buttonLabel: "Shop now",
  url: "https://example.com/kit",
}
const followUp = {
  message: "Still interested?",
  delayMinutes: 30,
  button: { label: "View kit", url: card.url },
}
const secret = "feature-test-webhook-secret"

describe("automation feature HTTP, SDK, database and worker integration", () => {
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let app: ApiApp
  let userId: string
  let workspaceId: string
  let accountId: string
  let profileId: string
  let accessToken: string
  const events: string[] = []
  const cookies = new Map<string, string>()

  async function request(
    path: string,
    method: "GET" | "POST" | "PATCH" = "GET",
    payload?: unknown
  ) {
    return app.inject({
      method,
      url: `/api${path}`,
      headers: {
        origin: new URL(config.appUrl).origin,
        cookie: [...cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
        ...(payload !== undefined && { "content-type": "application/json" }),
      },
      ...(payload !== undefined && { payload: JSON.stringify(payload) }),
    })
  }
  const input = (
    extras: Partial<CreateAutomationInput> = {}
  ): CreateAutomationInput => ({
    instagramAccountId: accountId,
    name: "Show the kit",
    status: "active",
    trigger: { postScope: "any_post" },
    keywords: ["KIT"],
    matchMode: "word",
    openingDm: null,
    dmMessage: "Your kit",
    dmButtons: [],
    commentReply: null,
    requireFollow: false,
    ...extras,
  })
  async function create(extras: Partial<CreateAutomationInput> = {}) {
    const result = await request("/automations", "POST", input(extras))
    expect(result.statusCode, result.body).toBe(201)
    return result.json<Automation>()
  }
  async function deliver(payload: Record<string, unknown>) {
    const id = randomUUID()
    events.push(id)
    const body = JSON.stringify({ id, ...payload })
    const inject = () =>
      app.inject({
        method: "POST",
        url: "/api/webhooks/zernio",
        payload: body,
        headers: {
          "x-zernio-signature": createHmac("sha256", secret)
            .update(body)
            .digest("hex"),
        },
      })
    return { response: await inject(), repeat: inject }
  }
  async function enqueue(
    automation: Automation,
    account = fixture.accountId,
    profile = profileId
  ) {
    const row = await admin
      .from("automations")
      .select("zernio_automation_id")
      .eq("id", automation.id)
      .single()
    const sentAt = new Date(Date.now() + 10).toISOString()
    const event = await deliver({
      event: "message.sent",
      account: {
        id: account,
        accountId: account,
        profileId: profile,
        platform: "instagram",
      },
      conversation: {
        id: fixture.conversationId,
        platformConversationId: "fixture-participant-1",
        participantId: "fixture-participant-1",
        participantName: "Ann Reader",
      },
      message: {
        id: randomUUID(),
        direction: "outgoing",
        sentAt,
        sentVia: "comment_automation",
        automationId: row.data!.zernio_automation_id,
      },
    })
    return { ...event, sentAt, providerId: row.data!.zernio_automation_id }
  }
  function worker(
    sentAt: string,
    repository = new SupabaseFollowUpRepository(admin)
  ) {
    return new FollowUpService(
      repository,
      new ZernioFollowUpProvider(() =>
        createZernioClient({
          apiUrl: fixture.apiUrl,
          apiKey: "fixture-api-key",
        })
      ),
      new SupabaseWorkspaceOperations(admin),
      () => new Date(Date.parse(sentAt) + 31 * 60_000)
    )
  }
  async function ready(automation: Automation, sentAt: string, clickCount = 0) {
    fixture.messages.splice(
      0,
      fixture.messages.length,
      {
        id: "opt-in",
        direction: "incoming",
        message: "Yes, send it",
        createdAt: new Date(Date.parse(sentAt) - 1000).toISOString(),
        attachments: [],
      },
      {
        id: "original",
        direction: "outgoing",
        message: "Your kit",
        createdAt: sentAt,
        attachments: [],
      }
    )
    fixture.state.automationLogs = [
      {
        id: `log-${automation.id}`,
        status: "sent",
        commenterId: "fixture-participant-1",
        createdAt: sentAt,
        clickCount,
      },
    ]
    const result = await admin
      .from("follow_up_jobs")
      .update({ retry_after: new Date(Date.now() - 1000).toISOString() })
      .eq("automation_id", automation.id)
      .eq("status", "pending")
    expect(result.error).toBeNull()
  }
  async function jobs(automation: Automation) {
    const result = await admin
      .from("follow_up_jobs")
      .select()
      .eq("automation_id", automation.id)
    expect(result.error).toBeNull()
    return result.data!
  }

  beforeAll(async () => {
    fixture = await startZernioFixture()
    app = createApi({
      ...config,
      zernio: {
        apiUrl: fixture.apiUrl,
        apiKey: "fixture-api-key",
        webhookSecret: secret,
      },
    })
    const email = `feature-${randomUUID()}@example.com`
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (created.error) throw created.error
    userId = created.data.user.id
    const session = await signInDisposableUser(config, email, cookies)
    accessToken = session.access_token
    workspaceId = await workspaceIdOf(config, userId)
    await grantPlan(config, workspaceId, "pro")
    expect((await request("/accounts/connect", "POST", {})).statusCode).toBe(
      200
    )
    const accounts = await request("/accounts/sync", "POST", {})
    expect(accounts.statusCode).toBe(200)
    accountId = accounts.json<{ id: string }[]>()[0]!.id
    profileId = (
      await admin
        .from("social_sets")
        .select("zernio_profile_id")
        .eq("workspace_id", workspaceId)
        .single()
    ).data!.zernio_profile_id!
  })
  afterAll(async () => {
    await app?.close()
    if (userId) await admin.auth.admin.deleteUser(userId)
    if (events.length)
      await admin.from("webhook_events").delete().in("id", events)
    await fixture?.close()
  })

  it("enforces features before a provider write and sends a real carousel SDK payload", async () => {
    const requestsBefore = fixture.requests.length
    expect(
      (
        await request(
          "/automations",
          "POST",
          input({ productCarousel: [card] })
        )
      ).statusCode
    ).toBe(403)
    expect(
      fixture.requests
        .slice(requestsBefore)
        .filter(
          (item) =>
            item.method === "POST" && item.path === "/v1/comment-automations"
        )
    ).toHaveLength(0)
    await grantPlan(config, workspaceId, "growth")
    const automation = await create({ productCarousel: [card] })
    expect(automation.productCarousel).toEqual([card])
    expect([...fixture.automations.values()].at(-1)).toMatchObject({
      template: {
        type: "generic",
        elements: [
          {
            title: card.title,
            imageUrl: card.imageUrl,
            buttons: [{ type: "url", title: card.buttonLabel, url: card.url }],
          },
        ],
      },
      buttons: [],
    })
    expect(
      (await request("/automations", "POST", input({ followUp }))).statusCode
    ).toBe(403)
    // Older clients omit new fields; their full updates preserve the carousel.
    const saved = await request(`/automations/${automation.id}`, "PATCH", {
      ...input(),
      name: "Updated by an older client",
    })
    expect(saved.statusCode, saved.body).toBe(200)
    expect(saved.json<Automation>().productCarousel).toEqual([card])
    const text = await request(`/automations/${automation.id}`, "PATCH", {
      ...input(),
      productCarousel: null,
      dmButtons: [{ label: "Kit", url: card.url }],
    })
    expect(text.statusCode, text.body).toBe(200)
    expect([...fixture.automations.values()].at(-1)).toMatchObject({
      template: null,
      buttons: [{ type: "url", title: "Kit", url: card.url }],
    })
  })

  it("enforces feature plans on scheduled automations and preserves their carousel and nudge", async () => {
    const payload = {
      instagramAccountId: accountId,
      kind: "post",
      caption: "Comment KIT for the collection",
      media: [{ type: "image", url: card.imageUrl }],
      scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
      automation: {
        name: "Scheduled collection",
        status: "active",
        keywords: ["KIT"],
        matchMode: "word",
        openingDm: null,
        dmMessage: "Browse the collection.",
        dmButtons: [],
        productCarousel: [card],
        followUp,
        commentReply: null,
        requireFollow: false,
      },
    }
    for (const plan of ["pro", "growth"] as const) {
      await grantPlan(config, workspaceId, plan)
      const postsBefore = fixture.posts.size
      const automationsBefore = fixture.automations.size
      const refused = await request("/scheduled-posts", "POST", payload)
      expect(refused.statusCode, refused.body).toBe(403)
      expect(fixture.posts.size).toBe(postsBefore)
      expect(fixture.automations.size).toBe(automationsBefore)
    }

    await grantPlan(config, workspaceId, "business")
    const response = await request("/scheduled-posts", "POST", payload)
    expect(response.statusCode, response.body).toBe(201)
    const post = response.json<ScheduledPost>()
    expect(post.automationIds).toHaveLength(1)
    const linked = await request(`/automations/${post.automationIds[0]}`)
    expect(linked.statusCode, linked.body).toBe(200)
    expect(linked.json<Automation>()).toMatchObject({
      trigger: { postScope: "scheduled_post", scheduledPost: { id: post.id } },
      productCarousel: [card],
      followUp,
    })
    const remote = [...fixture.automations.values()].at(-1)!
    expect(fixture.posts.has(String(remote.postId))).toBe(true)
    expect(remote).toMatchObject({
      isActive: true,
      buttons: [],
      template: { type: "generic", elements: [{ title: card.title }] },
    })
  })

  it("queues signed sends once, refuses a foreign tenant/account, and sends a durable reminder once", async () => {
    await grantPlan(config, workspaceId, "business")
    const automation = await create({ productCarousel: [card], followUp })
    expect(
      (await enqueue(automation, "foreign-account")).response.json()
    ).toMatchObject({ receipt: "ignored" })
    expect(
      (
        await enqueue(automation, fixture.accountId, "foreign-profile")
      ).response.json()
    ).toMatchObject({ receipt: "ignored" })
    expect(await jobs(automation)).toHaveLength(0)
    const event = await enqueue(automation)
    expect(event.response.statusCode, event.response.body).toBe(200)
    expect((await event.repeat()).json()).toEqual({ receipt: "duplicate" })
    const pending = await jobs(automation)
    expect(pending).toHaveLength(1)
    expect(Date.parse(pending[0]!.due_at) - Date.parse(event.sentAt)).toBe(
      30 * 60_000
    )
    // Owner RLS can see its queue, and an anonymous caller cannot read it.
    const scoped = createUserSupabaseClient(config.supabase, accessToken)
    expect(
      (
        await scoped
          .from("follow_up_jobs")
          .select("id")
          .eq("automation_id", automation.id)
      ).data
    ).toHaveLength(1)
    const anonymous = createClient(
      config.supabase.url,
      config.supabase.publishableKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    expect(
      (await anonymous.from("follow_up_jobs").select("id")).error?.code
    ).toBe("42501")
    await ready(automation, event.sentAt)
    const failures: unknown[] = []
    await worker(event.sentAt).run((error) => failures.push(error))
    expect(failures).toEqual([])
    expect((await jobs(automation))[0]).toMatchObject({
      status: "sent",
      provider_log_id: `log-${automation.id}`,
    })
    const sends = fixture.requests.filter(
      (item) => item.method === "POST" && item.path.includes("/messages")
    )
    expect(sends).toHaveLength(1)
    expect(sends[0]).toMatchObject({
      idempotencyKey: `aghost-nudge-${automation.id}-log-${automation.id}`,
      body: {
        message: followUp.message,
        buttons: [{ type: "url", title: "View kit", url: card.url }],
      },
    })
    await worker(event.sentAt).run((error) => failures.push(error))
    expect(
      fixture.requests.filter(
        (item) => item.method === "POST" && item.path.includes("/messages")
      )
    ).toHaveLength(1)
    expect(
      (
        await request(
          `/automations/${automation.id}/activity?limit=25&offset=0`
        )
      ).json()
    ).toMatchObject({
      followUps: [{ status: "sent", recipient: "Ann Reader" }],
    })
  })

  it("retains a successful send receipt across a failed save and a worker restart", async () => {
    const automation = await create({ followUp })
    const event = await enqueue(automation)
    await ready(automation, event.sentAt)
    const repository = new SupabaseFollowUpRepository(admin)
    const saveError = new Error("Database write interrupted")
    vi.spyOn(repository, "finish").mockImplementationOnce(async () => {
      // A reply arrives after the send but before its status save succeeds.
      const reply = await deliver({
        event: "message.received",
        account: { id: fixture.accountId, profileId, platform: "instagram" },
        conversation: {
          id: fixture.conversationId,
          platformConversationId: "fixture-participant-1",
          participantId: "fixture-participant-1",
        },
        message: {
          id: randomUUID(),
          direction: "incoming",
          sentAt: new Date(Date.now() + 1000).toISOString(),
        },
      })
      expect(reply.response.statusCode, reply.response.body).toBe(200)
      expect(reply.response.json()).toMatchObject({ receipt: "processed" })
      expect((await jobs(automation))[0]).toMatchObject({
        status: "cancelled",
        reason: "replied",
        delivery_receipt: null,
      })
      throw saveError
    })
    const before = fixture.requests.length
    const errors: unknown[] = []
    await worker(event.sentAt, repository).run((error) => errors.push(error))
    expect(errors).toEqual([saveError])
    const pending = (await jobs(automation))[0]!
    expect(pending).toMatchObject({
      status: "pending",
      reason: "saving_delivery",
      delivery_receipt: {
        logId: `log-${automation.id}`,
        messageId: expect.any(String),
      },
    })
    await admin
      .from("follow_up_jobs")
      .update({ retry_after: new Date(Date.now() - 1000).toISOString() })
      .eq("id", pending.id)
    await worker(event.sentAt).run((error) => {
      throw error
    })
    const recovered = (await jobs(automation))[0]!
    expect(recovered.status).toBe("sent")
    expect(Date.parse(recovered.sent_at!)).toBe(
      Date.parse(event.sentAt) + 31 * 60_000
    )
    expect(
      fixture.requests
        .slice(before)
        .filter(
          (item) => item.method === "POST" && item.path.includes("/messages")
        )
    ).toHaveLength(1)
  })

  it("keeps busy workspace deferrals out of the delivery attempt budget", async () => {
    const automation = await create({ followUp })
    const event = await enqueue(automation)
    await ready(automation, event.sentAt)
    const repository = new SupabaseFollowUpRepository(admin)
    for (let attempt = 0; attempt < 6; attempt++) {
      await admin
        .from("follow_up_jobs")
        .update({ retry_after: new Date(Date.now() - 1000).toISOString() })
        .eq("automation_id", automation.id)
      const owner = randomUUID()
      const claimed = (await repository.claim(owner)).find(
        (job) => job.automationId === automation.id
      )!
      expect(claimed.attempts).toBe(1)
      await repository.defer(claimed, owner)
      expect((await jobs(automation))[0]).toMatchObject({
        status: "pending",
        reason: "workspace_busy",
        attempts: 0,
      })
    }
    await admin
      .from("follow_up_jobs")
      .update({ retry_after: new Date(Date.now() - 1000).toISOString() })
      .eq("automation_id", automation.id)
    await worker(event.sentAt).run((error) => {
      throw error
    })
    expect((await jobs(automation))[0]).toMatchObject({
      status: "sent",
      attempts: 1,
    })
  })

  it("bounds a missing original-DM lookup instead of scanning all automation history", async () => {
    const automation = await create({ followUp })
    const event = await enqueue(automation)
    await ready(automation, event.sentAt)
    fixture.state.automationLogs = Array.from({ length: 2500 }, (_, index) => ({
      id: `other-${index}`,
      status: "sent",
      commenterId: "another-reader",
      createdAt: event.sentAt,
      clickCount: 0,
    }))
    const before = fixture.requests.length
    await worker(event.sentAt).run((error) => {
      throw error
    })
    expect((await jobs(automation))[0]).toMatchObject({
      status: "cancelled",
      reason: "unverified_delivery",
    })
    expect(
      fixture.requests
        .slice(before)
        .filter((item) => item.path.endsWith("/logs"))
    ).toHaveLength(10)
  })

  it("cancels after tracked clicks, after a reply, and when there is no messaging consent", async () => {
    const clicked = await create({ followUp })
    const first = await enqueue(clicked)
    await ready(clicked, first.sentAt, 1)
    await worker(first.sentAt).run((error) => {
      throw error
    })
    expect((await jobs(clicked))[0]).toMatchObject({
      status: "cancelled",
      reason: "clicked",
    })
    const replied = await create({ followUp })
    const second = await enqueue(replied)
    const reply = await deliver({
      event: "message.received",
      account: { id: fixture.accountId, profileId, platform: "instagram" },
      conversation: {
        id: fixture.conversationId,
        participantId: "fixture-participant-1",
        platformConversationId: "fixture-participant-1",
      },
      message: {
        id: randomUUID(),
        direction: "incoming",
        sentAt: new Date(Date.parse(second.sentAt) + 1000).toISOString(),
      },
    })
    expect(reply.response.statusCode).toBe(200)
    expect((await jobs(replied))[0]).toMatchObject({
      status: "cancelled",
      reason: "replied",
    })
    const cold = await create({ followUp })
    const third = await enqueue(cold)
    await ready(cold, third.sentAt)
    fixture.messages.splice(0, 1) // A comment/private reply alone does not open the DM window.
    await worker(third.sentAt).run((error) => {
      throw error
    })
    expect((await jobs(cold))[0]).toMatchObject({
      status: "cancelled",
      reason: "outside_window",
    })
  })

  it("cancels edited or paused automations and rechecks downgrades before delivery", async () => {
    const edited = await create({ followUp })
    await enqueue(edited)
    const update = await request(`/automations/${edited.id}`, "PATCH", {
      ...input(),
      name: "Edited reminder",
    })
    expect(update.statusCode).toBe(200)
    expect(update.json<Automation>().followUp).toEqual(followUp)
    expect((await jobs(edited))[0]).toMatchObject({
      status: "cancelled",
      reason: "automation_changed",
    })
    const paused = await create({ followUp })
    await enqueue(paused)
    expect(
      (
        await request(`/automations/${paused.id}/status`, "PATCH", {
          status: "paused",
        })
      ).statusCode
    ).toBe(200)
    expect((await jobs(paused))[0]!.status).toBe("cancelled")
    const downgraded = await create({ followUp })
    const event = await enqueue(downgraded)
    await ready(downgraded, event.sentAt)
    await grantPlan(config, workspaceId, "growth")
    await worker(event.sentAt).run((error) => {
      throw error
    })
    expect((await jobs(downgraded))[0]).toMatchObject({
      status: "cancelled",
      reason: "plan_changed",
    })
    expect(
      (
        await request(`/automations/${downgraded.id}/status`, "PATCH", {
          status: "active",
        })
      ).statusCode
    ).toBe(403)
    expect(
      (
        await request(`/automations/${downgraded.id}/status`, "PATCH", {
          status: "paused",
        })
      ).statusCode
    ).toBe(200)
    const unchanged = await request(`/automations/${downgraded.id}`, "PATCH", {
      ...input(),
      name: "Renamed paused draft",
      status: "paused",
      followUp,
    })
    expect(unchanged.statusCode, unchanged.body).toBe(200)
    expect(unchanged.json<Automation>()).toMatchObject({
      name: "Renamed paused draft",
      followUp,
      status: "paused",
    })
    const changed = await request(`/automations/${downgraded.id}`, "PATCH", {
      ...input(),
      status: "paused",
      followUp: { ...followUp, message: "A new reminder" },
    })
    expect(changed.statusCode, changed.body).toBe(403)
  })

  it("claims due jobs exclusively across replicas and recovers an expired lease", async () => {
    await grantPlan(config, workspaceId, "business")
    const first = await create({ followUp })
    const second = await create({ followUp })
    const one = await enqueue(first)
    const two = await enqueue(second)
    await ready(first, one.sentAt)
    await ready(second, two.sentAt)
    expect(await jobs(first)).toHaveLength(1)
    expect(await jobs(second)).toHaveLength(1)
    const owners = [randomUUID(), randomUUID()]
    const claims = await Promise.all(
      owners.map((p_owner) =>
        admin.rpc("claim_follow_up_jobs", { p_owner, p_limit: 1 })
      )
    )
    expect(claims.map((result) => result.error)).toEqual([null, null])
    const claimed = claims.map((result) => result.data![0]!)
    expect(claimed.every(Boolean)).toBe(true)
    expect(new Set(claimed.map((row) => row.id)).size).toBe(2)
    await admin
      .from("follow_up_jobs")
      .update({ lease_until: new Date(Date.now() - 1000).toISOString() })
      .eq("id", claimed[0]!.id)
    const reclaimed = await admin.rpc("claim_follow_up_jobs", {
      p_owner: randomUUID(),
      p_limit: 20,
    })
    expect(reclaimed.data).toHaveLength(1)
    expect(reclaimed.data![0]).toMatchObject({
      id: claimed[0]!.id,
      attempts: 2,
      status: "processing",
    })
  })
})
