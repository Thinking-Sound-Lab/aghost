import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import {
  insightQuerySchema,
  type InsightQuery,
  type InsightsUnavailable,
} from "../contract/insights"
import {
  CHANNEL_METRICS,
  type ChannelMetric,
  type Platform,
} from "../contract/platform"
import { createZernioClient } from "../infrastructure/zernio/zernio-client"
import { ZernioInsightsProvider } from "../infrastructure/zernio/zernio-insights.provider"
import type { AccountRecord } from "../modules/accounts/account"
import type {
  InsightsProvider,
  ProfileOverview,
} from "../modules/insights/insights.provider"
import { InsightsService } from "../modules/insights/insights.service"
import type { SocialSetRecord } from "../modules/social-sets/social-set"
import { startZernioFixture } from "./zernio-fixture"

const workspace = {
  id: "workspace",
  ownerId: "owner",
  name: "Workspace",
}
const socialSet: SocialSetRecord = {
  id: "set",
  workspaceId: workspace.id,
  name: "Studio",
  providerProfileId: "profile",
  createdAt: "2026-01-01T00:00:00Z",
}
const account: AccountRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  workspaceId: workspace.id,
  providerAccountId: "provider-account",
  platform: "instagram",
  username: "creator",
  status: "connected",
  displayName: null,
  profilePictureUrl: null,
  disconnectReason: null,
  socialSetId: "set",
  providerProfileId: "profile",
  sharedPlatformBeforeSets: false,
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
      getContent: vi.fn(async () => ({ status: "not_enabled" as const })),
      getPostingTimes: vi.fn(async () => ({
        status: "ready" as const,
        slots: [],
      })),
      getOverview: vi.fn(async () => ({ status: "not_enabled" as const })),
    }
    const findById = vi.fn(async () => stored)
    const listByWorkspace = vi.fn(async () => (stored ? [stored] : []))
    return {
      provider,
      findById,
      listByWorkspace,
      service: new InsightsService(
        provider,
        { findById, listByWorkspace },
        { resolve: async () => socialSet },
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
    await expect(service.getContent(workspace, query)).rejects.toMatchObject({
      code: "not_found",
    })
    expect(provider.getContent).not.toHaveBeenCalled()
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
    expect(await service.getContent(workspace, query)).toEqual({
      status: "reconnect_required",
    })
    expect(provider.getContent).not.toHaveBeenCalled()
  })

  it("anchors account-scoped timing to the current time without applying a date filter", async () => {
    const { provider, service } = setup()
    expect(await service.getPostingTimes(workspace, query)).toEqual({
      status: "ready",
      slots: [],
      referenceTime: "2027-01-02T01:00:00.000Z",
    })
    expect(provider.getPostingTimes).toHaveBeenCalledWith({
      profileId: account.providerProfileId,
      accountId: account.providerAccountId,
      platform: "instagram",
    })
  })

  it("uses an inclusive UTC date range across year boundaries", async () => {
    const { provider, service } = setup()
    await service.getReport(workspace, query)
    expect(provider.getReport).toHaveBeenCalledWith(
      {
        profileId: account.providerProfileId,
        accountId: account.providerAccountId,
        platform: "instagram",
      },
      { fromDate: "2026-12-27", toDate: "2027-01-02" },
      query
    )
    await service.getContent(workspace, query)
    expect(provider.getContent).toHaveBeenCalledWith(
      {
        profileId: account.providerProfileId,
        accountId: account.providerAccountId,
        platform: "instagram",
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

describe("the workspace overview", () => {
  const metrics = (values: Partial<Record<ChannelMetric, number>>) =>
    Object.fromEntries(
      CHANNEL_METRICS.map((metric) => [metric, values[metric] ?? null])
    ) as Record<ChannelMetric, number | null>
  const channel = (
    id: string,
    platform: Platform,
    providerAccountId: string,
    status: AccountRecord["status"] = "connected"
  ): AccountRecord => ({ ...account, id, platform, providerAccountId, status })

  function setup(
    accounts: AccountRecord[],
    overview: ProfileOverview | InsightsUnavailable
  ) {
    const getOverview = vi.fn(async () => overview)
    const provider: InsightsProvider = {
      getReport: vi.fn(async () => ({ status: "not_enabled" as const })),
      getPost: vi.fn(async () => ({ status: "not_enabled" as const })),
      getContent: vi.fn(async () => ({ status: "not_enabled" as const })),
      getPostingTimes: vi.fn(async () => ({ status: "not_enabled" as const })),
      getOverview,
    }
    return {
      getOverview,
      service: new InsightsService(
        provider,
        { findById: vi.fn(), listByWorkspace: vi.fn(async () => accounts) },
        { resolve: async () => socialSet },
        () => new Date("2027-01-02T01:00:00Z")
      ),
    }
  }

  it("groups connected channels by platform and leaves out the profile's other accounts", async () => {
    const { getOverview, service } = setup(
      [
        channel("ig", "instagram", "ig-1"),
        channel("li-a", "linkedin", "li-1"),
        channel("li-b", "linkedin", "li-2"),
        channel("yt", "youtube", "yt-1", "disconnected"),
      ],
      {
        status: "ready",
        followers: [
          { accountId: "ig-1", current: 100, gained: 5 },
          { accountId: "li-1", current: 50, gained: -2 },
          { accountId: "li-2", current: null, gained: null },
          { accountId: "yt-1", current: 999, gained: 9 },
          { accountId: "foreign", current: 777, gained: 7 },
        ],
        current: [
          {
            platform: "instagram",
            posts: 3,
            metrics: metrics({
              impressions: 5,
              reach: 1_000,
              views: 2_000,
              likes: 10,
              comments: 2,
              shares: 1,
              saves: 4,
            }),
          },
          {
            platform: "linkedin",
            posts: 2,
            metrics: metrics({
              impressions: 300,
              reach: 200,
              views: 40,
              likes: 6,
              comments: 1,
              shares: 0,
              saves: 0,
              clicks: 3,
            }),
          },
          { platform: "youtube", posts: 9, metrics: metrics({ views: 5_000 }) },
          { platform: "tiktok", posts: 1, metrics: metrics({ views: 10 }) },
        ],
        previous: [
          {
            platform: "instagram",
            posts: 1,
            metrics: metrics({
              views: 500,
              likes: 3,
              comments: 1,
              shares: 0,
              saves: 0,
            }),
          },
        ],
        updatedAt: "2027-01-02T00:30:00Z",
      }
    )
    const range = { fromDate: "2026-12-27", toDate: "2027-01-02" }
    const previousRange = { fromDate: "2026-12-20", toDate: "2026-12-26" }
    expect(await service.getOverview(workspace, { days: 7 })).toEqual({
      status: "ready",
      range,
      previousRange,
      followers: 150,
      followersGained: 3,
      totals: { posts: 5, views: 2_040, engagements: 24 },
      // LinkedIn published nothing before, which is zero, not unknown.
      previousTotals: { posts: 1, views: 500, engagements: 4 },
      channels: [
        {
          platform: "instagram",
          accountIds: ["ig"],
          followers: 100,
          followersGained: 5,
          posts: 3,
          engagements: 17,
          // Instagram posts report no impressions or clicks.
          metrics: {
            ...metrics({
              reach: 1_000,
              views: 2_000,
              likes: 10,
              comments: 2,
              shares: 1,
              saves: 4,
            }),
          },
        },
        {
          platform: "linkedin",
          accountIds: ["li-a", "li-b"],
          followers: 50,
          followersGained: -2,
          posts: 2,
          engagements: 7,
          metrics: metrics({
            impressions: 300,
            reach: 200,
            views: 40,
            likes: 6,
            comments: 1,
            shares: 0,
            saves: 0,
            clicks: 3,
          }),
        },
      ],
      updatedAt: "2027-01-02T00:30:00Z",
    })
    expect(getOverview).toHaveBeenCalledWith("profile", range, previousRange)
  })

  it("doesn't contact the provider without a connected channel", async () => {
    const { getOverview, service } = setup(
      [channel("yt", "youtube", "yt-1", "disconnected")],
      { status: "not_enabled" }
    )
    expect(await service.getOverview(workspace, { days: 30 })).toMatchObject({
      status: "ready",
      followers: null,
      totals: { posts: 0, views: null, engagements: null },
      channels: [],
    })
    expect(getOverview).not.toHaveBeenCalled()
  })

  it("passes on missing analytics access", async () => {
    const { service } = setup([channel("ig", "instagram", "ig-1")], {
      status: "not_enabled",
    })
    expect(await service.getOverview(workspace, { days: 30 })).toEqual({
      status: "not_enabled",
    })
  })
})

describe("Instagram insight SDK adapter", () => {
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let provider: ZernioInsightsProvider
  const range = { fromDate: "2026-10-01", toDate: "2026-10-07" }
  const owner = () => ({
    profileId: "profile",
    accountId: fixture.accountId,
    platform: "instagram" as const,
  })

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
    if (result.status !== "ready" || result.platform !== "instagram")
      throw new Error("Expected Instagram insights")
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
      page: "2",
      limit: "20",
      sortBy: "saves",
    })
    // Zernio answers a platform filter from older data; the account suffices.
    expect(list.query.has("platform")).toBe(false)
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
    if (absent.status !== "ready" || absent.platform !== "instagram")
      throw new Error("Expected Instagram insights")
    expect(absent.posts[0]?.metrics.views).toBeNull()
    expect(absent.dailyReach.every((point) => point.value === null)).toBe(true)
    fixture.state.analyticsMissing = false
    fixture.state.analyticsPending = true
    const pending = await provider.getReport(owner(), range, query)
    if (pending.status !== "ready") throw new Error("Expected insights")
    expect(pending.posts[0]?.metrics.views).toBeNull()
  })

  it("loads sorted content without fetching unchanged account totals or daily reach", async () => {
    const result = await provider.getContent(owner(), range, {
      page: 2,
      sort: "shares",
    })
    expect(result.status).toBe("ready")
    expect(result).not.toHaveProperty("summary")
    const paths = fixture.requests.map((item) => item.path)
    expect(paths.filter((path) => path === "/v1/analytics")).toHaveLength(1)
    expect(paths.some((path) => path.includes("account-insights"))).toBe(false)
    expect(
      Object.fromEntries(
        fixture.requests.find((item) => item.path === "/v1/analytics")!.query
      )
    ).toMatchObject({
      profileId: "profile",
      accountId: fixture.accountId,
      fromDate: range.fromDate,
      toDate: range.toDate,
      page: "2",
      sortBy: "shares",
    })
    fixture.state.analyticsOutsideAccount = true
    await expect(
      provider.getContent(owner(), range, query)
    ).rejects.toMatchObject({ code: "provider_error" })
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

  it("sums a whole profile's posts per platform, with followers per account", async () => {
    const previous = { fromDate: "2026-09-24", toDate: "2026-09-30" }
    // The fixture lists one Instagram post with these lifetime metrics.
    const totals = {
      platform: "instagram",
      posts: 1,
      metrics: {
        impressions: 15_000,
        reach: 8_000,
        views: 12_500,
        likes: 240,
        comments: 32,
        shares: 72,
        saves: 96,
        clicks: 18,
      },
    }
    expect(await provider.getOverview("profile", range, previous)).toEqual({
      status: "ready",
      // An entry without an account id can't be matched, so it's left out.
      followers: [
        { accountId: fixture.accountId, current: 1_200, gained: 40 },
        { accountId: "shrinking", current: 50, gained: -3 },
        // One daily count is no history: the change is unknown, not zero.
        { accountId: "new-account", current: 9, gained: null },
      ],
      current: [totals],
      previous: [totals],
      updatedAt: expect.any(String),
    })
    expect(
      fixture.requests.map((request) => [
        request.path,
        request.query.get("profileId"),
        request.query.get("accountId"),
        request.query.get("limit"),
        request.query.get("fromDate"),
        request.query.get("toDate"),
      ])
    ).toEqual(
      expect.arrayContaining([
        [
          "/v1/accounts/follower-stats",
          "profile",
          null,
          null,
          range.fromDate,
          range.toDate,
        ],
        ["/v1/analytics", "profile", null, "100", range.fromDate, range.toDate],
        [
          "/v1/analytics",
          "profile",
          null,
          "100",
          previous.fromDate,
          previous.toDate,
        ],
      ])
    )
    expect(fixture.requests).toHaveLength(3)
  })

  it("leaves metrics a pending post hasn't reported unknown", async () => {
    fixture.state.analyticsPending = true
    const result = await provider.getOverview("profile", range, range)
    if (result.status !== "ready") throw new Error("Expected an overview")
    expect(result.current).toEqual([
      expect.objectContaining({
        platform: "instagram",
        posts: 1,
        metrics: expect.objectContaining({ views: null, likes: null }),
      }),
    ])
  })

  it("reports a missing analytics add-on for the overview", async () => {
    fixture.state.analyticsFailureStatus = 403
    fixture.state.analyticsRequiresAddon = true
    expect(await provider.getOverview("profile", range, range)).toEqual({
      status: "not_enabled",
    })
  })

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
