import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client"
import { createAdminSupabaseClient } from "@workspace/supabase/server"
import type { InjectOptions } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { loadApiConfig } from "../config"
import { createApi } from "../container"
import type { InstagramAccount } from "../contract/account"
import type { ApiKeyScope, CreatedApiKey } from "../contract/api-key"
import type { Automation, PostAutomationInput } from "../contract/automation"
import type {
  MediaUpload,
  PostMedia,
  ScheduledPost,
  SchedulePostInput,
  UploadLink,
} from "../contract/post"
import type { ApiApp } from "../http/app"
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
if (
  !["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname)
) {
  throw new Error("Scheduled post tests may only use local Supabase.")
}
const admin = createAdminSupabaseClient(config.supabase)
const recorded = recordingAnalytics()
const HOUR = 3_600_000

/** An ISO time `hours` from now. */
const inHours = (hours: number) =>
  new Date(Date.now() + hours * HOUR).toISOString()

describe("scheduled posts and their automations against PostgreSQL and a local provider fixture", () => {
  let app: ApiApp
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let address: string
  let account: InstagramAccount
  let ownerCookie: string
  let otherCookie: string
  let ownerId: string
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

  async function key(scopes: ApiKeyScope[]) {
    const response = await session("/api-keys", "POST", {
      name: "Calendar agent",
      scopes,
    })
    expect(response.statusCode).toBe(201)
    return response.json<CreatedApiKey>().token
  }

  const automation = (): PostAutomationInput => ({
    name: "Launch post",
    status: "active",
    keywords: ["LINK"],
    matchMode: "word",
    openingDm: null,
    dmMessage: "Here is the link, {{first_name}}.",
    dmButtons: [{ label: "Open", url: "https://example.com/launch" }],
    commentReply: "Check your DMs!",
    requireFollow: false,
  })

  const post = (overrides: Partial<SchedulePostInput> = {}) => ({
    instagramAccountId: account.id,
    kind: "post" as const,
    caption: "Comment LINK for the launch guide",
    media: [
      { url: "https://media.example/temp/cover.jpg", type: "image" as const },
      { url: "https://media.example/temp/clip.mp4", type: "video" as const },
    ],
    scheduledFor: inHours(24),
    automation: null,
    ...overrides,
  })

  async function schedule(overrides: Partial<SchedulePostInput> = {}) {
    const response = await session("/scheduled-posts", "POST", post(overrides))
    expect(response.statusCode).toBe(201)
    return response.json<ScheduledPost>()
  }

  /** Moves a post's time into the past, as if it had come. */
  async function makeDue(id: string) {
    const { error } = await admin
      .from("scheduled_posts")
      .update({ scheduled_for: new Date(Date.now() - HOUR).toISOString() })
      .eq("id", id)
    if (error) throw new Error("Could not move the post's time")
  }

  const providerIdOf = async (id: string) =>
    (
      await admin
        .from("scheduled_posts")
        .select("zernio_post_id")
        .eq("id", id)
        .single()
    ).data!.zernio_post_id

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
    const cookies: string[] = []
    for (let index = 0; index < 2; index++) {
      const email = `aghost-calendar-${randomUUID()}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (error || !data.user)
        throw new Error("Could not create a disposable calendar user")
      userIds.push(data.user.id)
      const jar = new Map<string, string>()
      await signInDisposableUser(config, email, jar)
      cookies.push(
        [...jar].map(([name, value]) => `${name}=${value}`).join("; ")
      )
      await grantPlan(config, await workspaceIdOf(config, data.user.id), "pro")
    }
    ;[ownerCookie, otherCookie] = cookies as [string, string]
    ownerId = userIds[0]!
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
      if (error) throw new Error("Could not clean up a calendar user")
    }
  })

  it("asks an account connected without publishing to reconnect, keeping its place in the plan", async () => {
    fixture.state.canPost = false
    try {
      expect(
        (await session(`/accounts/${account.id}/publishing`)).json()
      ).toEqual({ canPublish: false })
      const refused = await session("/scheduled-posts", "POST", post())
      expect(refused.statusCode).toBe(409)
      expect(refused.json().error).toMatchObject({
        code: "publishing_not_allowed",
        message: expect.stringContaining("@fixture_creator"),
      })
      expect(fixture.posts.size).toBe(0)

      // Pro allows one account, and this one is connected: reconnecting it is
      // still allowed, and authorizes the same account with every permission.
      const reconnect = await session(
        `/accounts/${account.id}/reconnect`,
        "POST",
        {}
      )
      expect(reconnect.statusCode).toBe(200)
      expect(reconnect.json()).toEqual({
        authUrl: "https://example.com/fixture-oauth",
      })
      const authorize = fixture.requests
        .filter((request) => request.path === "/v1/connect/instagram")
        .at(-1)!
      expect(authorize.query.get("reconnectAccountId")).toBe(fixture.accountId)
      expect(authorize.query.get("scopes")).toBe("posting,comments,messaging")
      expect(recorded.namesFor(ownerId)).toContain(
        "instagram_reconnect_started"
      )
      expect(
        (
          await session(
            `/accounts/${account.id}/reconnect`,
            "POST",
            {},
            otherCookie
          )
        ).statusCode
      ).toBe(404)
      // A disconnected account may be gone from Zernio, so it connects
      // afresh instead of naming an account id Zernio would refuse.
      await admin
        .from("instagram_accounts")
        .update({
          status: "disconnected",
          disconnect_reason: "Instagram access expired or was revoked.",
        })
        .eq("id", account.id)
      expect(
        (await session(`/accounts/${account.id}/reconnect`, "POST", {}))
          .statusCode
      ).toBe(200)
      expect(
        fixture.requests
          .filter((request) => request.path === "/v1/connect/instagram")
          .at(-1)!
          .query.has("reconnectAccountId")
      ).toBe(false)
    } finally {
      fixture.state.canPost = true
      await admin
        .from("instagram_accounts")
        .update({ status: "connected", disconnect_reason: null })
        .eq("id", account.id)
    }
    expect(
      (await session(`/accounts/${account.id}/publishing`)).json()
    ).toEqual({ canPublish: true })
  })

  it("schedules a carousel with an automation that Zernio arms when the post publishes", async () => {
    const scheduledFor = new Date(Date.now() + 26 * HOUR)
    // A time with an offset is stored as the same instant in UTC.
    const local = new Date(scheduledFor.getTime() + 5.5 * HOUR)
      .toISOString()
      .replace("Z", "+05:30")
    const created = await schedule({
      caption: "  Comment LINK for the launch guide ",
      scheduledFor: local,
      automation: automation(),
    })
    expect(created).toMatchObject({
      instagramAccountId: account.id,
      kind: "post",
      caption: "Comment LINK for the launch guide",
      scheduledFor: scheduledFor.toISOString(),
      status: "scheduled",
      platformPostId: null,
      permalink: null,
      error: null,
    })
    expect(created).not.toHaveProperty("providerPostId")
    expect(created).not.toHaveProperty("workspaceId")
    expect(created.automationIds).toHaveLength(1)

    const providerPostId = await providerIdOf(created.id)
    expect(fixture.posts.get(providerPostId)).toMatchObject({
      content: "Comment LINK for the launch guide",
      mediaItems: [
        { url: "https://media.example/temp/cover.jpg", type: "image" },
        { url: "https://media.example/temp/clip.mp4", type: "video" },
      ],
      platforms: [
        {
          platform: "instagram",
          accountId: fixture.accountId,
          platformSpecificData: {},
        },
      ],
      scheduledFor: scheduledFor.toISOString(),
    })

    const linked = (
      await session(`/automations/${created.automationIds[0]}`)
    ).json<Automation>()
    expect(linked).toMatchObject({
      name: "Launch post",
      status: "active",
      trigger: {
        postScope: "scheduled_post",
        scheduledPost: {
          id: created.id,
          caption: "Comment LINK for the launch guide",
        },
      },
    })
    const remote = [...fixture.automations.values()].find(
      (item) => item.postId === providerPostId
    )
    expect(remote).toMatchObject({ postId: providerPostId, isActive: true })
    expect(remote).not.toHaveProperty("platformPostId")

    // Editing the automation keeps it on the scheduled post.
    const renamed = await session(`/automations/${linked.id}`, "PATCH", {
      ...automation(),
      name: "Launch DMs",
      trigger: { postScope: "scheduled_post", scheduledPostId: created.id },
    })
    expect(renamed.statusCode).toBe(200)
    const update = fixture.requests
      .filter(
        (request) =>
          request.method === "PATCH" &&
          request.path === `/v1/comment-automations/${remote!.id}`
      )
      .at(-1)!.body
    expect(update).toMatchObject({ name: "Launch DMs" })
    expect(update).not.toHaveProperty("postId")
    expect(update).not.toHaveProperty("platformPostId")

    // The automation shows the post's caption as it is now.
    const edited = await session(`/scheduled-posts/${created.id}`, "PATCH", {
      kind: "post",
      caption: "New caption",
      media: [{ url: "https://media.example/temp/cover.jpg", type: "image" }],
      scheduledFor: inHours(30),
    })
    expect(edited.statusCode).toBe(200)
    expect(fixture.posts.get(providerPostId)).toMatchObject({
      content: "New caption",
      mediaItems: [
        { url: "https://media.example/temp/cover.jpg", type: "image" },
      ],
    })
    expect(
      (await session(`/automations/${linked.id}`)).json<Automation>().trigger
    ).toEqual({
      postScope: "scheduled_post",
      scheduledPost: { id: created.id, caption: "New caption" },
    })
    // A story has no comments, so a post with an automation cannot become one.
    const story = await session(`/scheduled-posts/${created.id}`, "PATCH", {
      kind: "story",
      caption: "",
      media: [{ url: "https://media.example/temp/cover.jpg", type: "image" }],
      scheduledFor: inHours(30),
    })
    expect(story.statusCode).toBe(422)
    expect(story.json().error.fields).toHaveProperty("kind")

    expect(
      recorded.events.find(
        ({ event }) =>
          event.name === "post_scheduled" && event.post_id === created.id
      )?.event
    ).toEqual({
      name: "post_scheduled",
      post_id: created.id,
      kind: "post",
      media_count: 2,
      video_count: 1,
      has_caption: true,
      has_automation: true,
    })
  })

  it("restores a post's previous content and time when an added automation fails", async () => {
    const original = await schedule({
      caption: "Original caption",
      scheduledFor: inHours(48),
    })
    const remoteId = await providerIdOf(original.id)
    const edited = {
      kind: original.kind,
      caption: "Comment LINK for the guide",
      media: [{ url: "https://media.example/temp/new.jpg", type: "image" }],
      scheduledFor: inHours(72),
      automation: automation(),
    }
    const events = recorded.events.length
    fixture.state.automationFailureStatus = 500
    const failed = await session(
      `/scheduled-posts/${original.id}`,
      "PATCH",
      edited
    )
    expect(failed.statusCode).toBe(502)
    expect(
      (await session(`/scheduled-posts/${original.id}`)).json()
    ).toMatchObject({
      caption: original.caption,
      media: original.media,
      scheduledFor: original.scheduledFor,
      automationIds: [],
    })
    expect(fixture.posts.get(remoteId)).toMatchObject({
      content: original.caption,
      mediaItems: original.media,
      scheduledFor: original.scheduledFor,
    })
    expect(
      recorded.events.slice(events).map(({ event }) => event.name)
    ).not.toContain("scheduled_post_updated")

    const saved = await session(
      `/scheduled-posts/${original.id}`,
      "PATCH",
      edited
    )
    expect(saved.statusCode).toBe(200)
    const result = saved.json<ScheduledPost>()
    expect(result).toMatchObject({
      caption: edited.caption,
      media: edited.media,
      scheduledFor: edited.scheduledFor,
    })
    expect(result.automationIds).toHaveLength(1)
    expect(fixture.posts.get(remoteId)).toMatchObject({
      content: edited.caption,
      scheduledFor: edited.scheduledFor,
    })
    expect([...fixture.automations.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ postId: remoteId, isActive: true }),
      ])
    )
  })

  it("rejects posts that are too soon, malformed, or stories with an automation", async () => {
    const soon = await session(
      "/scheduled-posts",
      "POST",
      post({ scheduledFor: new Date(Date.now() + 60_000).toISOString() })
    )
    expect(soon.statusCode).toBe(422)
    expect(soon.json().error.fields).toEqual({
      scheduledFor: "Choose a time at least 5 minutes from now.",
    })
    const invalid = await session("/scheduled-posts", "POST", {
      ...post(),
      kind: "story",
      caption: "Stories have none",
      media: [
        { url: "http://media.example/a.jpg", type: "image" },
        { url: "https://media.example/b.jpg", type: "gif" },
      ],
      scheduledFor: "tomorrow",
      automation: automation(),
    })
    expect(invalid.statusCode).toBe(422)
    expect(Object.keys(invalid.json().error.fields).sort()).toEqual([
      "media.0.url",
      "media.1.type",
      "scheduledFor",
    ])
    const story = await session(
      "/scheduled-posts",
      "POST",
      post({
        kind: "story",
        caption: "Stories have none",
        automation: automation(),
      })
    )
    expect(story.statusCode).toBe(422)
    expect(Object.keys(story.json().error.fields).sort()).toEqual([
      "automation",
      "caption",
      "media",
    ])
    expect(
      (
        await session(
          `/scheduled-posts?from=${inHours(0)}&to=${inHours(24 * 100)}`
        )
      ).statusCode
    ).toBe(422)
  })

  it("lists a period's posts, reads their outcome from Zernio once due, and then locks them", async () => {
    const published = await schedule({ scheduledFor: inHours(2) })
    const failed = await schedule({
      kind: "story",
      caption: "",
      media: [{ url: "https://media.example/temp/story.mp4", type: "video" }],
      scheduledFor: inHours(3),
    })
    const publishedId = await providerIdOf(published.id)
    const failedId = await providerIdOf(failed.id)
    expect(fixture.posts.get(failedId)).toMatchObject({
      platforms: [{ platformSpecificData: { contentType: "story" } }],
    })
    expect(fixture.posts.get(failedId)).not.toHaveProperty("content")

    fixture.posts.set(publishedId, {
      ...fixture.posts.get(publishedId),
      status: "published",
      platforms: [
        {
          platform: "instagram",
          status: "published",
          platformPostId: "ig-published-1",
          platformPostUrl: "https://instagram.com/p/published",
          publishedAt: "2026-10-14T09:00:00.000Z",
        },
      ],
    })
    fixture.posts.set(failedId, {
      ...fixture.posts.get(failedId),
      status: "failed",
      platforms: [
        {
          platform: "instagram",
          status: "failed",
          errorMessage: "The video is too short.",
        },
      ],
    })
    // Not due yet: still shown as scheduled, without asking Zernio.
    const before = fixture.requests.length
    const range = `from=${encodeURIComponent(inHours(-2))}&to=${encodeURIComponent(inHours(4))}`
    const upcoming = (await session(`/scheduled-posts?${range}`)).json<
      ScheduledPost[]
    >()
    expect(upcoming.map((item) => [item.id, item.status])).toEqual([
      [published.id, "scheduled"],
      [failed.id, "scheduled"],
    ])
    expect(fixture.requests.length).toBe(before)

    await makeDue(published.id)
    await makeDue(failed.id)
    const due = (await session(`/scheduled-posts?${range}`)).json<
      ScheduledPost[]
    >()
    expect(due.find((item) => item.id === published.id)).toMatchObject({
      status: "published",
      platformPostId: "ig-published-1",
      permalink: "https://instagram.com/p/published",
      publishedAt: "2026-10-14T09:00:00.000Z",
      error: null,
    })
    expect(due.find((item) => item.id === failed.id)).toMatchObject({
      status: "failed",
      error: "The video is too short.",
    })
    // Settled posts are not read from Zernio again, and are recorded once.
    const settled = fixture.requests.length
    await session(`/scheduled-posts/${published.id}`)
    expect(fixture.requests.length).toBe(settled)
    expect(
      recorded.events
        .filter(
          ({ event }) =>
            "post_id" in event &&
            [published.id, failed.id].includes(event.post_id)
        )
        .map(({ event }) => event.name)
        .sort()
    ).toEqual([
      "post_scheduled",
      "post_scheduled",
      "scheduled_post_failed",
      "scheduled_post_published",
    ])

    const change = {
      kind: "post",
      caption: "Too late",
      media: [{ url: "https://media.example/temp/cover.jpg", type: "image" }],
      scheduledFor: inHours(5),
    }
    for (const id of [published.id, failed.id])
      expect(
        (await session(`/scheduled-posts/${id}`, "PATCH", change)).statusCode
      ).toBe(409)
    expect(
      (await session(`/scheduled-posts/${published.id}`, "DELETE")).statusCode
    ).toBe(409)
    expect(fixture.posts.has(publishedId)).toBe(true)
    // A failed post can be deleted, and is cancelled at Zernio.
    expect(
      (await session(`/scheduled-posts/${failed.id}`, "DELETE")).statusCode
    ).toBe(204)
    expect(fixture.posts.has(failedId)).toBe(false)
  })

  it("shows a post Zernio no longer has as failed instead of failing the calendar", async () => {
    const gone = await schedule({ scheduledFor: inHours(6) })
    fixture.posts.delete(await providerIdOf(gone.id))
    await makeDue(gone.id)
    const read = await session(`/scheduled-posts/${gone.id}`)
    expect(read.statusCode).toBe(200)
    expect(read.json<ScheduledPost>()).toMatchObject({
      status: "failed",
      error: "This post was removed before it could be published.",
    })
  })

  it("cancels a deleted post together with its automation, and keeps posts within the workspace", async () => {
    const created = await schedule({ automation: automation() })
    const providerPostId = await providerIdOf(created.id)
    const automationId = created.automationIds[0]!
    expect(
      (
        await session(
          `/scheduled-posts/${created.id}`,
          "GET",
          undefined,
          otherCookie
        )
      ).statusCode
    ).toBe(404)
    expect(
      (
        await session(
          `/scheduled-posts/${created.id}`,
          "DELETE",
          undefined,
          otherCookie
        )
      ).statusCode
    ).toBe(404)
    expect(
      (
        await session(
          "/automations",
          "POST",
          {
            ...automation(),
            instagramAccountId: account.id,
            trigger: {
              postScope: "scheduled_post",
              scheduledPostId: created.id,
            },
          },
          otherCookie
        )
      ).statusCode
    ).toBe(404)

    expect(
      (await session(`/scheduled-posts/${created.id}`, "DELETE")).statusCode
    ).toBe(204)
    expect(fixture.posts.has(providerPostId)).toBe(false)
    expect(
      [...fixture.automations.values()].some(
        (item) => item.postId === providerPostId
      )
    ).toBe(false)
    expect((await session(`/automations/${automationId}`)).statusCode).toBe(404)
    expect((await session(`/scheduled-posts/${created.id}`)).statusCode).toBe(
      404
    )
    expect(
      recorded.events
        .filter(
          ({ event }) =>
            ("post_id" in event && event.post_id === created.id) ||
            ("automation_id" in event && event.automation_id === automationId)
        )
        .map(({ event }) => [
          event.name,
          "reason" in event ? event.reason : null,
        ])
    ).toEqual([
      ["automation_created", null],
      ["automation_activated", null],
      ["post_scheduled", null],
      ["automation_deleted", "post_deleted"],
      ["scheduled_post_deleted", "owner"],
    ])
  })

  it("does not keep a post whose automation Zernio refused", async () => {
    const caption = `Refused ${randomUUID()}`
    const posts = fixture.posts.size
    const events = recorded.events.length
    fixture.state.automationFailureStatus = 500
    const response = await session(
      "/scheduled-posts",
      "POST",
      post({ caption, automation: automation() })
    )
    expect(response.statusCode).toBe(502)
    // Zernio had scheduled the post; it is cancelled again.
    expect(fixture.posts.size).toBe(posts)
    const stored = await admin
      .from("scheduled_posts")
      .select("id")
      .eq("caption", caption)
    expect(stored.data).toEqual([])
    expect(
      recorded.events.slice(events).map(({ event }) => event.name)
    ).not.toContain("post_scheduled")
  })

  it("lets agents upload media, schedule posts and attach automations over REST and MCP", async () => {
    const token = await key(["posts:read", "posts:write"])
    const upload = await rest(token, "/media/uploads", "POST", {
      filename: "launch.mp4",
      contentType: "video/mp4",
      size: 1024,
    })
    expect(upload.statusCode).toBe(201)
    const media = upload.json<MediaUpload>()
    expect(media).toMatchObject({
      uploadUrl: "https://storage.example/upload/launch.mp4?signature=fixture",
      media: { url: "https://media.example/temp/launch.mp4", type: "video" },
    })
    expect(Date.parse(media.expiresAt)).toBeGreaterThan(Date.now())
    for (const file of [
      { filename: "a.gif", contentType: "image/gif", size: 1 },
      { filename: "a.jpg", contentType: "image/jpeg", size: 21 * 1024 * 1024 },
    ])
      expect(
        (await rest(token, "/media/uploads", "POST", file)).statusCode
      ).toBe(422)

    // Attaching an automation, or deleting one with its post, also needs
    // permission to write automations.
    const refused = await rest(
      token,
      "/scheduled-posts",
      "POST",
      post({ automation: automation() })
    )
    expect(refused.statusCode).toBe(403)
    const answered = await schedule({ automation: automation() })
    expect(
      (await rest(token, `/scheduled-posts/${answered.id}`, "DELETE"))
        .statusCode
    ).toBe(403)
    expect((await session(`/scheduled-posts/${answered.id}`)).statusCode).toBe(
      200
    )
    expect(
      (await session(`/scheduled-posts/${answered.id}`, "DELETE")).statusCode
    ).toBe(204)
    const scheduled = await rest(token, "/scheduled-posts", "POST", {
      ...post(),
      media: [media.media],
    })
    expect(scheduled.statusCode).toBe(201)
    const id = scheduled.json<ScheduledPost>().id
    expect(
      (
        await rest(token, `/scheduled-posts/${id}`, "PATCH", {
          ...post(),
          automation: automation(),
        })
      ).statusCode
    ).toBe(403)
    const range = `from=${encodeURIComponent(inHours(23))}&to=${encodeURIComponent(inHours(25))}`
    expect(
      (await rest(token, `/scheduled-posts?${range}`))
        .json<ScheduledPost[]>()
        .map((item) => item.id)
    ).toContain(id)
    const document = (await rest(token, "/openapi.json")).json()
    expect(document.paths["/scheduled-posts"].post).toMatchObject({
      operationId: "schedule_post",
      "x-required-scope": "posts:write",
    })
    expect(
      document.paths["/scheduled-posts"].get.parameters.map(
        (parameter: { name: string }) => parameter.name
      )
    ).toEqual(["from", "to"])

    const full = await key([
      "posts:read",
      "posts:write",
      "automations:read",
      "automations:write",
    ])
    const client = new Client({ name: "aghost-calendar", version: "1.0.0" })
    clients.push(client)
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${address}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${full}` } },
      })
    )
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "list_scheduled_posts",
        "get_scheduled_post",
        "create_media_upload",
        "schedule_post",
        "update_scheduled_post",
        "delete_scheduled_post",
      ])
    )
    const updated = await client.callTool({
      name: "update_scheduled_post",
      arguments: {
        postId: id,
        input: post({ automation: { ...automation(), status: "paused" } }),
      },
    })
    expect(updated.isError).not.toBe(true)
    expect(
      (updated.structuredContent as { data: ScheduledPost }).data.automationIds
    ).toHaveLength(1)
    const created = await client.callTool({
      name: "schedule_post",
      arguments: post({ automation: { ...automation(), status: "paused" } }),
    })
    expect(created.isError).not.toBe(true)
    const data = (created.structuredContent as { data: ScheduledPost }).data
    expect(data.automationIds).toHaveLength(1)
    const linked = await client.callTool({
      name: "get_automation",
      arguments: { automationId: data.automationIds[0] },
    })
    expect(
      (linked.structuredContent as { data: Automation }).data
    ).toMatchObject({
      status: "paused",
      trigger: { postScope: "scheduled_post", scheduledPost: { id: data.id } },
    })
    const removed = await client.callTool({
      name: "delete_scheduled_post",
      arguments: { postId: data.id },
    })
    expect(removed.isError).not.toBe(true)
    expect((await session(`/scheduled-posts/${data.id}`)).statusCode).toBe(404)

    const reader = new Client({ name: "aghost-reader", version: "1.0.0" })
    clients.push(reader)
    await reader.connect(
      new StreamableHTTPClientTransport(new URL(`${address}/api/mcp`), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${await key(["posts:read"])}`,
          },
        },
      })
    )
    expect(
      (await reader.listTools()).tools.map((tool) => tool.name).sort()
    ).toEqual(["get_scheduled_post", "get_upload_link", "list_scheduled_posts"])
  })

  it("lets an agent that cannot upload have the owner upload in the browser, once and within the owner's workspace", async () => {
    const token = await key(["posts:read", "posts:write"])
    const created = await rest(token, "/upload-links", "POST", {})
    expect(created.statusCode).toBe(201)
    const link = created.json<UploadLink>()
    expect(link).toMatchObject({
      url: `${config.appUrl}/upload?link=${link.id}`,
      status: "waiting",
      media: [],
      uploadedAt: null,
    })
    expect(Date.parse(link.expiresAt)).toBeGreaterThan(Date.now() + 23 * HOUR)

    // The owner's page reads the link; another owner cannot see or fill it.
    const media: PostMedia[] = [
      { url: "https://media.example/temp/cover.jpg", type: "image" },
      { url: "https://media.example/temp/clip.mp4", type: "video" },
    ]
    expect(
      (await session(`/upload-links/${link.id}`)).json<UploadLink>()
    ).toMatchObject({ id: link.id, status: "waiting" })
    expect(
      (await session(`/upload-links/${link.id}`, "GET", undefined, otherCookie))
        .statusCode
    ).toBe(404)
    expect(
      (
        await session(
          `/upload-links/${link.id}/complete`,
          "POST",
          { media },
          otherCookie
        )
      ).statusCode
    ).toBe(404)
    expect(
      (
        await session(`/upload-links/${link.id}/complete`, "POST", {
          media: [],
        })
      ).statusCode
    ).toBe(422)

    const completed = await session(
      `/upload-links/${link.id}/complete`,
      "POST",
      { media }
    )
    expect(completed.statusCode).toBe(200)
    expect(completed.json<UploadLink>()).toMatchObject({
      status: "uploaded",
      media,
    })
    const again = await session(`/upload-links/${link.id}/complete`, "POST", {
      media: [media[0]],
    })
    expect(again.statusCode).toBe(409)
    expect(
      recorded.events.find(
        ({ event }) =>
          event.name === "upload_link_completed" &&
          event.upload_link_id === link.id
      )?.event
    ).toMatchObject({ media_count: 2, video_count: 1 })

    // The agent reads the files in the owner's order and schedules them.
    const read = await rest(token, `/upload-links/${link.id}`)
    expect(read.json<UploadLink>()).toMatchObject({ status: "uploaded", media })
    const scheduled = await rest(token, "/scheduled-posts", "POST", {
      ...post(),
      media: read.json<UploadLink>().media,
    })
    expect(scheduled.statusCode).toBe(201)
    expect(scheduled.json<ScheduledPost>().media).toEqual(media)

    // An expired link takes no files.
    const late = (
      await rest(token, "/upload-links", "POST", {})
    ).json<UploadLink>()
    const { error } = await admin
      .from("upload_links")
      .update({ expires_at: new Date(Date.now() - 1_000).toISOString() })
      .eq("id", late.id)
    if (error) throw new Error("Could not expire the upload link")
    expect(
      (await rest(token, `/upload-links/${late.id}`)).json<UploadLink>().status
    ).toBe("expired")
    const refused = await session(`/upload-links/${late.id}/complete`, "POST", {
      media,
    })
    expect(refused.statusCode).toBe(409)
    expect(refused.json().error.message).toBe(
      "This link has expired. Ask your agent for a new one."
    )

    // Links older than Zernio keeps uploads are removed with the next one.
    const { error: aging } = await admin
      .from("upload_links")
      .update({
        created_at: new Date(Date.now() - 8 * 24 * HOUR).toISOString(),
      })
      .eq("id", link.id)
    if (aging) throw new Error("Could not age the upload link")
    const client = new Client({ name: "aghost-uploads", version: "1.0.0" })
    clients.push(client)
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${address}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      })
    )
    const made = await client.callTool({
      name: "create_upload_link",
      arguments: {},
    })
    expect(made.isError).not.toBe(true)
    const fresh = (made.structuredContent as { data: UploadLink }).data
    expect(fresh.status).toBe("waiting")
    const fetched = await client.callTool({
      name: "get_upload_link",
      arguments: { uploadLinkId: fresh.id },
    })
    expect(
      (fetched.structuredContent as { data: UploadLink }).data
    ).toMatchObject({ id: fresh.id, url: fresh.url, status: "waiting" })
    expect((await rest(token, `/upload-links/${link.id}`)).statusCode).toBe(404)
  })

  it("shows apps that support MCP Apps an upload box that hands the owner's files to the agent", async () => {
    const token = await key(["posts:read", "posts:write"])
    const client = new Client({ name: "aghost-upload-box", version: "1.0.0" })
    clients.push(client)
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${address}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      })
    )
    const { tools } = await client.listTools()
    const meta = (name: string) =>
      tools.find((tool) => tool.name === name)?._meta
    expect(meta("create_upload_link")).toEqual({
      ui: { resourceUri: "ui://aghost/upload" },
    })
    // Only the box finishes a link; apps keep the tool from the agent.
    expect(meta("complete_upload_link")).toEqual({
      ui: { visibility: ["app"] },
    })
    expect(meta("create_media_upload")).toBeUndefined()

    // The box may reach only the storage that upload URLs point to.
    const { contents } = await client.readResource({
      uri: "ui://aghost/upload",
    })
    expect(contents).toEqual([
      {
        uri: "ui://aghost/upload",
        mimeType: "text/html;profile=mcp-app",
        text: expect.stringContaining('"maxItems":10'),
        _meta: {
          ui: {
            csp: {
              connectDomains: [
                expect.stringMatching(
                  /^https:\/\/[a-z0-9.-]+\.r2\.cloudflarestorage\.com$/
                ),
              ],
            },
            prefersBorder: true,
          },
        },
      },
    ])
    expect(contents[0]).not.toMatchObject({
      text: expect.stringContaining("{{LIMITS}}"),
    })

    // What the box does: upload each file, then hand them over at once.
    const made = await client.callTool({
      name: "create_upload_link",
      arguments: {},
    })
    const link = (made.structuredContent as { data: UploadLink }).data
    const upload = await client.callTool({
      name: "create_media_upload",
      arguments: { filename: "reel.mp4", contentType: "video/mp4", size: 2048 },
    })
    const { media } = (upload.structuredContent as { data: MediaUpload }).data
    const completed = await client.callTool({
      name: "complete_upload_link",
      arguments: { uploadLinkId: link.id, media: [media] },
    })
    expect(completed.isError).not.toBe(true)
    expect(
      (completed.structuredContent as { data: UploadLink }).data
    ).toMatchObject({ id: link.id, status: "uploaded", media: [media] })
    const again = await client.callTool({
      name: "complete_upload_link",
      arguments: { uploadLinkId: link.id, media: [media] },
    })
    expect(again.isError).toBe(true)
    expect(again.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          error: {
            code: "conflict",
            message:
              "These files were already sent to your agent. Ask it for a new link to send others.",
          },
        }),
      },
    ])
    const read = await client.callTool({
      name: "get_upload_link",
      arguments: { uploadLinkId: link.id },
    })
    expect((read.structuredContent as { data: UploadLink }).data.media).toEqual(
      [media]
    )

    // A key that can only read has no box, and another workspace's box
    // cannot finish this owner's link.
    const reader = new Client({ name: "aghost-reader", version: "1.0.0" })
    clients.push(reader)
    await reader.connect(
      new StreamableHTTPClientTransport(new URL(`${address}/api/mcp`), {
        requestInit: {
          headers: { Authorization: `Bearer ${await key(["posts:read"])}` },
        },
      })
    )
    await expect(
      reader.readResource({ uri: "ui://aghost/upload" })
    ).rejects.toThrow()
    const fresh = (
      (await client.callTool({ name: "create_upload_link", arguments: {} }))
        .structuredContent as { data: UploadLink }
    ).data
    const otherKey = await session(
      "/api-keys",
      "POST",
      { name: "Other agent", scopes: ["posts:write"] },
      otherCookie
    )
    const other = new Client({ name: "aghost-other", version: "1.0.0" })
    clients.push(other)
    await other.connect(
      new StreamableHTTPClientTransport(new URL(`${address}/api/mcp`), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${otherKey.json<CreatedApiKey>().token}`,
          },
        },
      })
    )
    const foreign = await other.callTool({
      name: "complete_upload_link",
      arguments: { uploadLinkId: fresh.id, media: [media] },
    })
    expect(foreign.isError).toBe(true)
    expect(foreign.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          error: { code: "not_found", message: "Upload link was not found." },
        }),
      },
    ])
  })

  it("cancels an account's scheduled posts when the account is removed", async () => {
    const pending = await schedule({ automation: automation() })
    const providerPostId = await providerIdOf(pending.id)
    expect(
      (await session(`/accounts/${account.id}`, "DELETE")).statusCode
    ).toBe(204)
    expect(fixture.posts.has(providerPostId)).toBe(false)
    const left = await admin
      .from("scheduled_posts")
      .select("id")
      .eq("instagram_account_id", account.id)
    expect(left.data).toEqual([])
    expect(
      recorded.events.find(
        ({ event }) =>
          event.name === "scheduled_post_deleted" &&
          event.post_id === pending.id
      )?.event
    ).toMatchObject({ reason: "account_removed" })
  })
})
