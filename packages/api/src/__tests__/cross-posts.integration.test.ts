import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { createAdminSupabaseClient } from "@workspace/supabase/server"
import type { InjectOptions } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { loadApiConfig } from "../config"
import { createApi } from "../container"
import type { Account } from "../contract/account"
import type { CreatedApiKey } from "../contract/api-key"
import type { PostAutomationInput } from "../contract/automation"
import type { InsightContentReport, InsightReport } from "../contract/insights"
import type { Platform } from "../contract/platform"
import type { CrossPostInput, PostMedia, ScheduledPost } from "../contract/post"
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
  posthog: null,
}
if (
  !["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname)
) {
  throw new Error("Cross-post tests may only use local Supabase.")
}
const admin = createAdminSupabaseClient(config.supabase)
const recorded = recordingAnalytics()
type Recorded = Awaited<
  ReturnType<typeof startZernioFixture>
>["requests"][number]
let requests: Recorded[] = []
/** The most recent provider request that matches. */
const latest = (matches: (request: Recorded) => boolean) =>
  [...requests].reverse().find(matches)
const inHours = (hours: number) =>
  new Date(Date.now() + hours * 3_600_000).toISOString()

const video: PostMedia[] = [
  { url: "https://media.example/temp/launch.mp4", type: "video" },
]
const photos: PostMedia[] = [
  { url: "https://media.example/temp/a.jpg", type: "image" },
  { url: "https://media.example/temp/b.jpg", type: "image" },
]

describe("cross-posting to several platforms against PostgreSQL and a local provider fixture", () => {
  let app: ApiApp
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let cookie: string
  let userId: string
  const accounts = {} as Record<Platform, Account>

  async function session(
    path: string,
    method: InjectOptions["method"] = "GET",
    body?: unknown
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

  const automation = (): PostAutomationInput => ({
    name: "Launch",
    status: "active",
    keywords: ["LINK"],
    matchMode: "word",
    openingDm: null,
    dmMessage: "Here is the link.",
    dmButtons: [{ label: "Open", url: "https://example.com/launch" }],
    commentReply: null,
    requireFollow: false,
  })

  const crossPost = (overrides: Partial<CrossPostInput> = {}) =>
    session("/scheduled-posts/batch", "POST", {
      kind: "post",
      caption: "Launch day.",
      media: video,
      scheduledFor: inHours(24),
      automation: null,
      targets: [{ accountId: accounts.instagram.id }],
      ...overrides,
    })

  const created = () =>
    fixture.requests.filter(
      (request) => request.method === "POST" && request.path === "/v1/posts"
    )

  beforeAll(async () => {
    fixture = await startZernioFixture()
    requests = fixture.requests
    fixture.state.extraAccounts = [
      {
        _id: `linkedin-${randomUUID()}`,
        platform: "linkedin",
        username: "studio-co",
        displayName: "Studio Co",
        isActive: true,
      },
      {
        _id: `twitter-${randomUUID()}`,
        platform: "twitter",
        username: "studio",
        displayName: "Studio",
        isActive: true,
      },
      {
        // Pages and channels may come with a name and no handle.
        _id: `youtube-${randomUUID()}`,
        platform: "youtube",
        displayName: "Studio Channel",
        isActive: true,
      },
      {
        _id: `facebook-${randomUUID()}`,
        platform: "facebook",
        displayName: "Studio Page",
        isActive: true,
      },
      {
        _id: `threads-${randomUUID()}`,
        platform: "threads",
        username: "studio",
        isActive: true,
      },
      // Not offered: another platform, and an account made for ads.
      {
        _id: `pinterest-${randomUUID()}`,
        platform: "pinterest",
        username: "studio",
        isActive: true,
      },
      {
        _id: `hidden-${randomUUID()}`,
        platform: "linkedin",
        username: "hidden",
        isActive: true,
        enabled: false,
      },
    ]
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
    await app.listen({ port: 0, host: "127.0.0.1" })
    const email = `aghost-cross-post-${randomUUID()}@example.com`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error("Could not create a user")
    userId = data.user.id
    const jar = new Map<string, string>()
    await signInDisposableUser(config, email, jar)
    cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ")
    await grantPlan(config, await workspaceIdOf(config, userId), "growth")
  })

  afterAll(async () => {
    await app?.close()
    await fixture?.close()
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  it("connects every platform with its own scopes and syncs the accounts Zernio lists", async () => {
    for (const [platform, scopes] of [
      ["linkedin", "posting,analytics"],
      ["instagram", "posting,analytics,comments,messaging"],
    ] as const) {
      const response = await session("/accounts/connect", "POST", { platform })
      expect(response.statusCode).toBe(200)
      const request = latest((item) => item.path.startsWith("/v1/connect/"))!
      expect(request.path).toBe(`/v1/connect/${platform}`)
      expect(request.query.get("scopes")).toBe(scopes)
    }
    // Dashboards from before other platforms connect Instagram.
    await session("/accounts/connect", "POST", {})
    expect(latest((item) => item.path.startsWith("/v1/connect/"))?.path).toBe(
      "/v1/connect/instagram"
    )
    expect(
      (await session("/accounts/connect", "POST", { platform: "tiktok" }))
        .statusCode
    ).toBe(422)

    const synced = await session("/accounts/sync", "POST", {})
    expect(synced.statusCode).toBe(200)
    const list = synced.json<Account[]>()
    expect(list.map((account) => account.platform).sort()).toEqual([
      "facebook",
      "instagram",
      "linkedin",
      "threads",
      "twitter",
      "youtube",
    ])
    for (const account of list) accounts[account.platform] = account
    expect(accounts.youtube.username).toBe("Studio Channel")
    expect(accounts.facebook.username).toBe("Studio Page")
    expect(list.every((account) => account.status === "connected")).toBe(true)
  })

  it("publishes one copy per account with each platform's caption and settings", async () => {
    const before = created().length
    const long = `Launch day. ${"More details. ".repeat(30)}`.trim()
    const response = await crossPost({
      caption: long,
      automation: automation(),
      targets: [
        { accountId: accounts.instagram.id },
        { accountId: accounts.linkedin.id },
        { accountId: accounts.twitter.id, caption: "Launch day, in short." },
        {
          accountId: accounts.youtube.id,
          youtube: { title: "Launch day", madeForKids: false },
        },
      ],
    })
    expect(response.statusCode).toBe(201)
    const posts = response.json<ScheduledPost[]>()
    expect(posts.map((post) => post.platform)).toEqual([
      "instagram",
      "linkedin",
      "twitter",
      "youtube",
    ])
    expect(posts.map((post) => post.accountId)).toEqual([
      accounts.instagram.id,
      accounts.linkedin.id,
      accounts.twitter.id,
      accounts.youtube.id,
    ])
    expect(posts[2]!.caption).toBe("Launch day, in short.")
    expect(posts[1]!.caption).toBe(long)
    expect(posts[3]!.youtube).toEqual({
      title: "Launch day",
      madeForKids: false,
    })
    // Only Instagram answers comments with a DM.
    expect(posts.map((post) => post.automationIds.length)).toEqual([1, 0, 0, 0])

    const requests = created().slice(before)
    expect(requests).toHaveLength(4)
    const targets = requests.map(
      (request) =>
        (request.body.platforms as Record<string, unknown>[])[0] as {
          platform: string
          platformSpecificData: unknown
        }
    )
    expect(targets.map((target) => target.platform)).toEqual([
      "instagram",
      "linkedin",
      "twitter",
      "youtube",
    ])
    expect(targets[3]!.platformSpecificData).toEqual({
      title: "Launch day",
      madeForKids: false,
    })
    expect(requests[2]!.body.content).toBe("Launch day, in short.")

    // The calendar lists each copy on its platform, and its state is read
    // from the right platform once it is due.
    const listed = await session(
      `/scheduled-posts?${new URLSearchParams({
        from: inHours(23),
        to: inHours(25),
      })}`
    )
    expect(
      listed
        .json<ScheduledPost[]>()
        .filter((post) => posts.some((item) => item.id === post.id))
        .map((post) => post.platform)
        .sort()
    ).toEqual(["instagram", "linkedin", "twitter", "youtube"])
    await admin
      .from("scheduled_posts")
      .update({ scheduled_for: inHours(-1) })
      .eq("id", posts[1]!.id)
    const due = await session(`/scheduled-posts/${posts[1]!.id}`)
    expect(due.statusCode).toBe(200)
    expect(due.json<ScheduledPost>().status).toBe("scheduled")
    expect(recorded.events.map(({ event }) => event)).toContainEqual(
      expect.objectContaining({ name: "post_scheduled", platform: "youtube" })
    )
  })

  it("checks every copy against its platform before scheduling any", async () => {
    const before = created().length
    const response = await crossPost({
      caption: "x".repeat(300),
      media: [...photos, ...video],
      targets: [
        { accountId: accounts.twitter.id },
        { accountId: accounts.youtube.id },
        { accountId: accounts.linkedin.id, caption: "Short" },
      ],
    })
    expect(response.statusCode).toBe(422)
    expect(response.json().error.fields).toEqual({
      "targets.0.caption": "X takes up to 280 characters",
      "targets.0.media": "X takes several photos or one video",
      "targets.1.media": "YouTube needs one video",
      "targets.1.youtube.title": "Give the video a title",
      "targets.2.media": "LinkedIn takes several photos or one video",
    })
    const story = await crossPost({
      kind: "story",
      caption: "",
      targets: [
        { accountId: accounts.instagram.id },
        { accountId: accounts.facebook.id },
      ],
    })
    expect(story.statusCode).toBe(422)
    expect(story.json().error.fields).toEqual({
      "targets.1.kind": "Facebook has no stories here",
    })
    const twice = await crossPost({
      targets: [
        { accountId: accounts.instagram.id },
        { accountId: accounts.instagram.id },
      ],
    })
    expect(twice.statusCode).toBe(422)
    expect(created().length).toBe(before)
  })

  it("posts text alone where the platform allows it", async () => {
    const text = await crossPost({
      caption: "Text only.",
      media: [],
      targets: [
        { accountId: accounts.twitter.id },
        { accountId: accounts.threads.id },
        { accountId: accounts.facebook.id },
      ],
    })
    expect(text.statusCode).toBe(201)
    expect(
      text.json<ScheduledPost[]>().every((post) => post.media.length === 0)
    ).toBe(true)
    const instagram = await crossPost({
      caption: "Text only.",
      media: [],
      targets: [{ accountId: accounts.instagram.id }],
    })
    expect(instagram.statusCode).toBe(422)
    expect(instagram.json().error.fields).toEqual({
      "targets.0.media": "Instagram needs a photo or video",
    })
  })

  it("schedules all copies or none", async () => {
    const start = fixture.requests.length
    const { count: rowsBefore } = await admin
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
    fixture.state.postsBeforeFailure = 2
    const response = await crossPost({
      media: photos,
      automation: automation(),
      targets: [
        { accountId: accounts.instagram.id },
        { accountId: accounts.linkedin.id },
        { accountId: accounts.facebook.id },
      ],
    })
    expect(response.statusCode).toBe(502)
    const requests = fixture.requests.slice(start)
    const scheduled = requests.filter(
      (request) => request.method === "POST" && request.path === "/v1/posts"
    )
    expect(scheduled).toHaveLength(3)
    // The two copies Zernio had already taken are cancelled again.
    expect(
      requests.filter(
        (request) =>
          request.method === "DELETE" && request.path.startsWith("/v1/posts/")
      )
    ).toHaveLength(2)
    const { count: rowsAfter } = await admin
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
    expect(rowsAfter).toBe(rowsBefore)
  })

  it("edits a copy under its own platform's rules", async () => {
    const [linkedin, youtube] = (
      await crossPost({
        targets: [
          { accountId: accounts.linkedin.id },
          {
            accountId: accounts.youtube.id,
            youtube: { title: "Original title", madeForKids: false },
          },
        ],
      })
    ).json<ScheduledPost[]>()
    const content = {
      kind: "post",
      media: video,
      scheduledFor: inHours(30),
      automation: null,
    }
    const tooLong = await session(`/scheduled-posts/${linkedin!.id}`, "PATCH", {
      ...content,
      caption: "x".repeat(3001),
    })
    expect(tooLong.statusCode).toBe(422)
    expect(tooLong.json().error.fields).toEqual({
      caption: "LinkedIn takes up to 3,000 characters",
    })
    const withAutomation = await session(
      `/scheduled-posts/${linkedin!.id}`,
      "PATCH",
      { ...content, caption: "Hi", automation: automation() }
    )
    expect(withAutomation.json().error.fields).toEqual({
      automation: "Comment-to-DM automations are for Instagram",
    })
    // An omitted YouTube setting keeps the stored title.
    const kept = await session(`/scheduled-posts/${youtube!.id}`, "PATCH", {
      ...content,
      caption: "New description",
    })
    expect(kept.statusCode).toBe(200)
    expect(kept.json<ScheduledPost>().youtube?.title).toBe("Original title")
    const update = latest((request) => request.method === "PUT")!
    expect(
      (update.body.platforms as { platformSpecificData: unknown }[])[0]!
        .platformSpecificData
    ).toEqual({ title: "Original title", madeForKids: false })
  })

  it("keeps automations and the inbox on Instagram, and lets agents post everywhere", async () => {
    const automationOnLinkedIn = await session("/automations", "POST", {
      ...automation(),
      instagramAccountId: accounts.linkedin.id,
      trigger: { postScope: "any_post" },
    })
    expect(automationOnLinkedIn.statusCode).toBe(404)
    expect(
      (await session(`/accounts/${accounts.linkedin.id}/posts`)).statusCode
    ).toBe(404)

    const apiKey = await session("/api-keys", "POST", {
      name: "Scheduler",
      scopes: ["accounts:read", "posts:read", "posts:write"],
    })
    const { token } = apiKey.json<CreatedApiKey>()
    const scheduled = await app.inject({
      method: "POST",
      url: "/api/v1/scheduled-posts",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      payload: JSON.stringify({
        instagramAccountId: accounts.linkedin.id,
        kind: "post",
        caption: "From an agent",
        media: photos,
        scheduledFor: inHours(24),
      }),
    })
    expect(scheduled.statusCode).toBe(422)
    expect(scheduled.json().error.fields).toHaveProperty("instagramAccountId")

    // cross_post schedules on any platform, under each one's rules.
    const agentPost = (body: unknown) =>
      app.inject({
        method: "POST",
        url: "/api/v1/scheduled-posts/batch",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        payload: JSON.stringify({
          kind: "post",
          caption: "From an agent",
          media: photos,
          scheduledFor: inHours(24),
          ...(body as object),
        }),
      })
    const before = created().length
    const crossPosted = await agentPost({
      targets: [
        { accountId: accounts.linkedin.id },
        { accountId: accounts.twitter.id, caption: "From an agent, on X" },
      ],
    })
    expect(crossPosted.statusCode).toBe(201)
    expect(
      crossPosted
        .json<ScheduledPost[]>()
        .map((post) => [post.platform, post.caption])
    ).toEqual([
      ["linkedin", "From an agent"],
      ["twitter", "From an agent, on X"],
    ])
    expect(created()).toHaveLength(before + 2)
    const tooLong = await agentPost({
      caption: "x".repeat(300),
      targets: [{ accountId: accounts.twitter.id }],
    })
    expect(tooLong.statusCode).toBe(422)
    expect(tooLong.json().error.fields).toHaveProperty("targets.0.caption")
    // Answering comments needs the automations permission too.
    const withAutomation = await agentPost({
      automation: automation(),
      targets: [{ accountId: accounts.instagram.id }],
    })
    expect(withAutomation.statusCode).toBe(403)
    expect(created()).toHaveLength(before + 2)
    const document = await app.inject({
      method: "GET",
      url: "/api/v1/openapi.json",
      headers: { authorization: `Bearer ${token}` },
    })
    expect(document.json().paths["/scheduled-posts/batch"].post).toMatchObject({
      operationId: "cross_post",
      "x-required-scope": "posts:write",
    })

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
      headers: { authorization: `Bearer ${token}` },
    })
    expect(
      listed
        .json<Account[]>()
        .map((account) => account.platform)
        .sort()
    ).toContain("linkedin")
  })

  it("reports another platform's analytics from its posts, leaving unreported metrics unknown", async () => {
    const report = await session(
      `/insights?accountId=${accounts.twitter.id}&days=7&sort=impressions`
    )
    expect(report.statusCode).toBe(200)
    const body = report.json<InsightReport>()
    if (body.status !== "ready" || body.platform === "instagram")
      throw new Error("Expected an X report")
    expect(body.platform).toBe("twitter")
    // X reports no reach or saves, whatever the provider's zeros say.
    expect(body.totals).toEqual({
      impressions: 4_000,
      reach: null,
      views: 3_100,
      likes: 120,
      comments: 14,
      shares: 9,
      saves: null,
      clicks: 21,
    })
    expect(body.postCount).toBe(2)
    expect(body.dailyMetric).toBe("impressions")
    expect(body.daily).toHaveLength(7)
    expect(body.daily[0]?.value).toBe(4_000)
    expect(body.posts[0]?.metrics).toMatchObject({
      impressions: 15_000,
      reach: null,
      saves: null,
      clicks: 18,
      engagementRate: null,
      averageWatchSeconds: null,
    })
    const daily = latest(
      (request) => request.path === "/v1/analytics/daily-metrics"
    )!
    expect(Object.fromEntries(daily.query)).toMatchObject({
      accountId: fixture.state.extraAccounts[1]!._id,
      platform: "twitter",
    })
    const list = latest((request) => request.path === "/v1/analytics")!
    expect(list.query.get("sortBy")).toBe("impressions")

    const content = await session(
      `/insights/content?accountId=${accounts.youtube.id}&days=30`
    )
    const page = content.json<InsightContentReport>()
    if (page.status !== "ready") throw new Error("Expected content")
    expect(page.platform).toBe("youtube")
    expect(page.posts[0]?.kind).toBe("video")
    expect(page.posts[0]?.metrics.impressions).toBeNull()

    fixture.state.dailyMetricsForeign = true
    const mixed = await session(
      `/insights?accountId=${accounts.linkedin.id}&days=7`
    )
    fixture.state.dailyMetricsForeign = false
    expect(mixed.statusCode).toBe(502)
  })

  it("keeps one account per platform in each social set, and sets per plan", async () => {
    const workspaceId = await workspaceIdOf(config, userId)
    await grantPlan(config, workspaceId, "pro")
    const taken = await session("/accounts/connect", "POST", {
      platform: "linkedin",
    })
    expect(taken.statusCode).toBe(409)
    expect(taken.json().error.message).toBe(
      "Social set 1 already has a LinkedIn account. Use another social set, or disconnect that account first."
    )
    const refused = await session("/social-sets", "POST", { name: "Brand" })
    expect(refused.statusCode).toBe(403)
    expect(refused.json().error.message).toBe(
      "Pro includes 1 social set. Upgrade to add another."
    )

    await grantPlan(config, workspaceId, "growth")
    const created = await session("/social-sets", "POST", { name: "Brand" })
    expect(created.statusCode).toBe(201)
    const set = created.json<{ id: string; name: string }>()
    expect(set.name).toBe("Brand")
    const connected = await session("/accounts/connect", "POST", {
      platform: "linkedin",
      socialSetId: set.id,
    })
    expect(connected.statusCode).toBe(200)
    // The new set connects through its own profile.
    const request = latest((item) => item.path.startsWith("/v1/connect/"))!
    expect(request.query.get("profileId")).not.toBe(
      latest((item) => item.path === "/v1/accounts")?.query.get("profileId")
    )
    // A set with no channels can go; the first one can't.
    expect((await session(`/social-sets/${set.id}`, "DELETE")).statusCode).toBe(
      204
    )
    const [first] = (await session("/social-sets")).json<{ id: string }[]>()
    expect(
      (await session(`/social-sets/${first!.id}`, "DELETE")).statusCode
    ).toBe(409)
  })
})
