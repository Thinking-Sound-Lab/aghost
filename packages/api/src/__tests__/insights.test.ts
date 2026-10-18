import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { insightQuerySchema, type InsightQuery } from "../contract/insights"
import { createZernioClient } from "../infrastructure/zernio/zernio-client"
import { ZernioInsightsProvider } from "../infrastructure/zernio/zernio-insights.provider"
import type { AccountRecord } from "../modules/accounts/account"
import type { InsightsProvider } from "../modules/insights/insights.provider"
import { InsightsService } from "../modules/insights/insights.service"
import { startZernioFixture } from "./zernio-fixture"

const workspace = {
  id: "workspace",
  ownerId: "owner",
  name: "Workspace",
  providerProfileId: "profile",
}
const account: AccountRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  workspaceId: workspace.id,
  providerAccountId: "provider-account",
  username: "creator",
  status: "connected",
  displayName: null,
  profilePictureUrl: null,
  disconnectReason: null,
  createdAt: "2026-01-01T00:00:00Z",
}
const query: InsightQuery = {
  accountId: account.id,
  days: 7,
  page: 1,
  sort: "views",
}

describe("workspace-scoped Instagram insights", () => {
  function setup(stored: AccountRecord | null = account) {
    const provider: InsightsProvider = {
      getReport: vi.fn(async () => ({ status: "not_enabled" as const })),
      getPost: vi.fn(async () => ({ status: "not_enabled" as const })),
      getPostingTimes: vi.fn(async () => ({
        status: "ready" as const,
        slots: [],
      })),
    }
    const findById = vi.fn(async () => stored)
    return {
      provider,
      findById,
      service: new InsightsService(
        provider,
        { findById },
        () => new Date("2027-01-02T01:00:00Z")
      ),
    }
  }

  it("checks workspace ownership before contacting the provider", async () => {
    const { provider, findById, service } = setup(null)
    await expect(service.getReport(workspace, query)).rejects.toMatchObject({
      code: "not_found",
    })
    expect(findById).toHaveBeenCalledWith(workspace.id, account.id)
    expect(provider.getReport).not.toHaveBeenCalled()
    await expect(
      service.getPost(workspace, "foreign-post", query)
    ).rejects.toMatchObject({ code: "not_found" })
    expect(provider.getPost).not.toHaveBeenCalled()
    await expect(
      service.getPostingTimes(workspace, query)
    ).rejects.toMatchObject({ code: "not_found" })
    expect(provider.getPostingTimes).not.toHaveBeenCalled()
  })

  it("offers reconnection for disconnected accounts without contacting Instagram", async () => {
    const { provider, service } = setup({ ...account, status: "disconnected" })
    expect(await service.getReport(workspace, query)).toEqual({
      status: "reconnect_required",
    })
    expect(provider.getReport).not.toHaveBeenCalled()
    expect(await service.getPostingTimes(workspace, query)).toEqual({
      status: "reconnect_required",
    })
    expect(provider.getPostingTimes).not.toHaveBeenCalled()
  })

  it("anchors account-scoped timing to the current time without applying a date filter", async () => {
    const { provider, service } = setup()
    expect(await service.getPostingTimes(workspace, query)).toEqual({
      status: "ready",
      slots: [],
      referenceTime: "2027-01-02T01:00:00.000Z",
    })
    expect(provider.getPostingTimes).toHaveBeenCalledWith({
      profileId: workspace.providerProfileId,
      accountId: account.providerAccountId,
    })
  })

  it("uses an inclusive UTC date range across year boundaries", async () => {
    const { provider, service } = setup()
    await service.getReport(workspace, query)
    expect(provider.getReport).toHaveBeenCalledWith(
      {
        profileId: workspace.providerProfileId,
        accountId: account.providerAccountId,
      },
      { fromDate: "2026-12-27", toDate: "2027-01-02" },
      query
    )
  })

  it("only accepts the supported periods and valid pagination", () => {
    expect(insightQuerySchema.parse({ accountId: account.id })).toEqual({
      ...query,
      days: 30,
    })
    for (const invalid of [
      { days: 365 },
      { page: 0 },
      { sort: "unknown" },
      { accountId: "foreign" },
    ])
      expect(
        insightQuerySchema.safeParse({ ...query, ...invalid }).success
      ).toBe(false)
  })
})

describe("Instagram insight SDK adapter", () => {
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let provider: ZernioInsightsProvider
  const range = { fromDate: "2026-10-01", toDate: "2026-10-07" }
  const owner = () => ({ profileId: "profile", accountId: fixture.accountId })

  beforeAll(async () => {
    fixture = await startZernioFixture()
    const client = createZernioClient({
      apiUrl: fixture.apiUrl,
      apiKey: "fixture-api-key",
    })
    provider = new ZernioInsightsProvider(() => client)
  })
  afterAll(async () => fixture.close())
  beforeEach(() => {
    fixture.requests.length = 0
    Object.assign(fixture.state, {
      canFetchAnalytics: true,
      analyticsFailureStatus: 0,
      analyticsOutsideAccount: false,
      analyticsMissing: false,
      analyticsPending: false,
      analyticsMediaProductType: "REELS",
      analyticsRequiresAddon: false,
      analyticsTimingSlots: [
        { day_of_week: 2, hour: 13, avg_engagement: 510.3, post_count: 15 },
        { day_of_week: 6, hour: 23, avg_engagement: 0, post_count: 1 },
      ],
    })
  })

  it("uses account totals, preserves missing dates and zero, and converts watch milliseconds", async () => {
    const result = await provider.getReport(owner(), range, {
      page: 2,
      sort: "saves",
    })
    expect(result.status).toBe("ready")
    if (result.status !== "ready") throw new Error("Expected insights")
    expect(result.summary.reach).toBe(13_200)
    expect(result.dailyReach.slice(0, 3)).toEqual([
      { date: "2026-10-01", value: 240 },
      { date: "2026-10-02", value: 0 },
      { date: "2026-10-03", value: null },
    ])
    expect(result.posts[0]?.metrics).toMatchObject({
      views: 12_500,
      averageWatchSeconds: 12.5,
      totalWatchSeconds: 156_250,
      skipRate: 32.4,
      engagementRate: 5.5,
    })
    const list = fixture.requests.find(
      (request) => request.path === "/v1/analytics"
    )!
    expect(Object.fromEntries(list.query)).toMatchObject({
      profileId: "profile",
      accountId: fixture.accountId,
      platform: "instagram",
      page: "2",
      limit: "20",
      sortBy: "saves",
    })
    const series = fixture.requests.find(
      (request) => request.query.get("metricType") === "time_series"
    )!
    expect(series.query.get("metrics")).toBe("reach")
  })

  it("doesn't turn absent or pending metrics into zeros", async () => {
    fixture.state.analyticsMissing = true
    const absent = await provider.getReport(owner(), range, query)
    expect(absent).toMatchObject({
      status: "ready",
      summary: { views: null, reach: null },
    })
    if (absent.status !== "ready") throw new Error("Expected insights")
    expect(absent.posts[0]?.metrics.views).toBeNull()
    expect(absent.dailyReach.every((point) => point.value === null)).toBe(true)
    fixture.state.analyticsMissing = false
    fixture.state.analyticsPending = true
    const pending = await provider.getReport(owner(), range, query)
    if (pending.status !== "ready") throw new Error("Expected insights")
    expect(pending.posts[0]?.metrics.views).toBeNull()
  })

  it("doesn't show reel-only counters for feed posts", async () => {
    fixture.state.analyticsMediaProductType = "FEED"
    const result = await provider.getReport(owner(), range, query)
    if (result.status !== "ready") throw new Error("Expected insights")
    expect(result.posts[0]).toMatchObject({
      kind: "post",
      metrics: {
        averageWatchSeconds: null,
        totalWatchSeconds: null,
        skipRate: null,
      },
    })
  })

  it("blocks a response for another account", async () => {
    fixture.state.analyticsOutsideAccount = true
    await expect(
      provider.getReport(owner(), range, query)
    ).rejects.toMatchObject({ code: "provider_error" })
    await expect(
      provider.getPost(owner(), "foreign", range)
    ).rejects.toMatchObject({ code: "not_found" })
    expect(
      fixture.requests.some((request) => request.path.endsWith("post-timeline"))
    ).toBe(false)
  })

  it("only returns history for the post on the authorized Instagram account", async () => {
    const result = await provider.getPost(
      owner(),
      "fixture-analytics-post",
      range
    )
    if (result.status !== "ready") throw new Error("Expected insights")
    expect(result.post.metrics.views).toBe(12_500)
    expect(result.views.slice(0, 3)).toEqual([
      { date: "2026-10-01", value: 120 },
      { date: "2026-10-02", value: 640 },
      { date: "2026-10-03", value: null },
    ])
  })

  it("asks for reconnection when insights permission was not granted", async () => {
    fixture.state.canFetchAnalytics = false
    expect(await provider.getReport(owner(), range, query)).toEqual({
      status: "reconnect_required",
    })
    expect(fixture.requests).toHaveLength(1)
  })

  it("requests all posting history for one account and preserves UTC and sample counts", async () => {
    expect(await provider.getPostingTimes(owner())).toEqual({
      status: "ready",
      slots: [
        { dayOfWeek: 2, hour: 13, averageEngagement: 510.3, postCount: 15 },
        { dayOfWeek: 6, hour: 23, averageEngagement: 0, postCount: 1 },
      ],
    })
    const request = fixture.requests.find(
      (item) => item.path === "/v1/analytics/best-time"
    )!
    expect(Object.fromEntries(request.query)).toEqual({
      profileId: "profile",
      accountId: fixture.accountId,
      platform: "instagram",
      source: "all",
    })
    fixture.state.analyticsTimingSlots = []
    expect(await provider.getPostingTimes(owner())).toEqual({
      status: "ready",
      slots: [],
    })
  })

  it.each(["missing", "invalid", "duplicate"])(
    "rejects %s timing data instead of suggesting invented times",
    async (mode) => {
      if (mode === "missing") fixture.state.analyticsMissing = true
      if (mode === "invalid") fixture.state.analyticsTimingSlots[0]!.hour = 24
      if (mode === "duplicate")
        fixture.state.analyticsTimingSlots.push({
          ...fixture.state.analyticsTimingSlots[0]!,
        })
      await expect(provider.getPostingTimes(owner())).rejects.toMatchObject({
        code: "provider_error",
      })
    }
  )

  it("distinguishes a required analytics add-on from permission failures for posting times", async () => {
    fixture.state.analyticsFailureStatus = 403
    fixture.state.analyticsRequiresAddon = true
    expect(await provider.getPostingTimes(owner())).toEqual({
      status: "not_enabled",
    })
    fixture.state.analyticsRequiresAddon = false
    expect(await provider.getPostingTimes(owner())).toEqual({
      status: "reconnect_required",
    })
    fixture.state.analyticsFailureStatus = 0
    fixture.state.canFetchAnalytics = false
    fixture.requests.length = 0
    expect(await provider.getPostingTimes(owner())).toEqual({
      status: "reconnect_required",
    })
    expect(fixture.requests).toHaveLength(1)
  })

  it.each([
    [402, "not_enabled"],
    [403, "reconnect_required"],
    [412, "reconnect_required"],
  ] as const)(
    "handles provider status %s with a useful availability state",
    async (status, expected) => {
      fixture.state.analyticsFailureStatus = status
      expect(await provider.getReport(owner(), range, query)).toEqual({
        status: expected,
      })
    }
  )
})
