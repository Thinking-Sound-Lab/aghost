import type {
  AnalyticsListResponse,
  AnalyticsSinglePostResponse,
  GetDailyMetricsResponse,
  PostAnalytics,
} from "@zernio/node"
import { ZernioApiError } from "@zernio/node"
import { z } from "zod"
import type {
  ChannelReport,
  InsightMetrics,
  InsightPoint,
  InsightPost,
  InsightPostReport,
  InsightQuery,
  InsightRange,
  InsightReport,
  InsightsUnavailable,
  InsightTimingData,
  InsightContentReport,
} from "../../contract/insights"
import {
  CHANNEL_METRICS,
  PLATFORM_RULES,
  type ChannelMetric,
  type Platform,
} from "../../contract/platform"
import type {
  InsightAccount,
  InsightsProvider,
  PlatformTotals,
  ProfileOverview,
} from "../../modules/insights/insights.provider"
import { NotFoundError, ProviderError } from "../../shared/errors"
import { causeOf, hasStatus, request, type ZernioAccess } from "./zernio-client"

const PAGE_SIZE = 20
type ListedPost = NonNullable<AnalyticsListResponse["posts"]>[number]
const timingResponse = z.object({
  slots: z
    .array(
      z.object({
        day_of_week: z.number().int().min(0).max(6),
        hour: z.number().int().min(0).max(23),
        avg_engagement: z.number().nonnegative(),
        post_count: z.number().int().min(1),
      })
    )
    .max(168),
})

export class ZernioInsightsProvider implements InsightsProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  getContent(
    account: InsightAccount,
    range: InsightRange,
    query: Pick<InsightQuery, "page" | "sort">
  ): Promise<InsightContentReport> {
    return available(async () => {
      if (!(await this.canRead(account.accountId)))
        return { status: "reconnect_required" }
      return this.readContent(account, range, query)
    })
  }

  getPostingTimes(
    account: InsightAccount
  ): Promise<InsightTimingData | InsightsUnavailable> {
    return available(async () => {
      if (!(await this.canRead(account.accountId)))
        return { status: "reconnect_required" }
      const result = await request("load suggested posting times", () =>
        this.zernio().analytics.getBestTimeToPost({
          throwOnError: true,
          query: {
            profileId: account.profileId,
            accountId: account.accountId,
            platform: account.platform,
            source: "all",
          },
        })
      )
      const parsed = timingResponse.safeParse(result)
      if (!parsed.success)
        throw new ProviderError(
          "Couldn't load posting times. The response had invalid time slots."
        )
      const slots = parsed.data.slots.map((slot) => ({
        dayOfWeek: slot.day_of_week,
        hour: slot.hour,
        averageEngagement: slot.avg_engagement,
        postCount: slot.post_count,
      }))
      if (
        new Set(slots.map((slot) => `${slot.dayOfWeek}:${slot.hour}`)).size !==
        slots.length
      )
        throw new ProviderError(
          "Couldn't load posting times. The response had duplicate time slots."
        )
      return { status: "ready", slots }
    })
  }

  getReport(
    account: InsightAccount,
    range: InsightRange,
    query: Pick<InsightQuery, "page" | "sort">
  ): Promise<InsightReport> {
    return available(async () => {
      if (!(await this.canRead(account.accountId)))
        return { status: "reconnect_required" }
      if (account.platform !== "instagram")
        return this.channelReport(account, account.platform, range, query)

      const client = this.zernio()
      const [totals, daily, content] = await Promise.all([
        request("load Instagram performance", () =>
          client.analytics.getInstagramAccountInsights({
            throwOnError: true,
            query: {
              accountId: account.accountId,
              ...range,
              metricType: "total_value",
              metrics: "views,reach,accounts_engaged,total_interactions",
            },
          })
        ),
        request("load daily Instagram reach", () =>
          client.analytics.getInstagramAccountInsights({
            throwOnError: true,
            query: {
              accountId: account.accountId,
              ...range,
              metricType: "time_series",
              metrics: "reach",
            },
          })
        ),
        this.readContent(account, range, query),
      ])

      if (content.status !== "ready") return content
      for (const result of [totals, daily]) {
        if (
          result.accountId !== account.accountId ||
          result.platform !== "instagram"
        )
          throw new ProviderError(
            "Couldn't load analytics. The response was for another account."
          )
      }

      return {
        ...content,
        platform: "instagram",
        summary: {
          views: number(totals.metrics?.views?.total),
          reach: number(totals.metrics?.reach?.total),
          accountsEngaged: number(totals.metrics?.accounts_engaged?.total),
          totalInteractions: number(totals.metrics?.total_interactions?.total),
        },
        dailyReach: series(range, daily.metrics?.reach?.values ?? []),
      }
    })
  }

  getPost(
    account: InsightAccount,
    postId: string,
    range: InsightRange
  ): Promise<InsightPostReport> {
    return available(async () => {
      if (!(await this.canRead(account.accountId)))
        return { status: "reconnect_required" }

      const client = this.zernio()
      const result = await request("load post performance", () =>
        client.analytics.getAnalytics({
          throwOnError: true,
          query: {
            postId,
            profileId: account.profileId,
            accountId: account.accountId,
            platform: account.platform,
          },
        })
      )
      // Single-post lookups can ignore the list filters. Prove ownership from
      // the per-platform account before reading the timeline or any metrics.
      const detail = result as AnalyticsSinglePostResponse
      const platform = detail.platformAnalytics?.find(
        (item) =>
          item.platform === account.platform &&
          item.accountId === account.accountId
      )
      if (!platform) throw new NotFoundError("Post")
      const timeline = await request("load the post's view history", () =>
        client.analytics.getPostTimeline({
          throwOnError: true,
          query: {
            postId,
            fromDate: `${range.fromDate}T00:00:00.000Z`,
            toDate: `${range.toDate}T23:59:59.999Z`,
          },
        })
      )
      const post = toPost(account.platform, {
        id: postId,
        platformPostId: platform.platformPostId ?? null,
        content: detail.content,
        publishedAt: detail.publishedAt,
        permalink: platform.platformPostUrl,
        thumbnailUrl: detail.thumbnailUrl,
        mediaType: detail.mediaType,
        mediaProductType: detail.mediaProductType,
        analytics:
          platform.syncStatus === "pending" ||
          platform.syncStatus === "unavailable"
            ? null
            : platform.analytics,
      })
      return {
        status: "ready",
        post,
        views: series(
          range,
          (timeline.timeline ?? [])
            .filter(
              (item) =>
                item.platform === account.platform &&
                Boolean(post.platformPostId) &&
                item.platformPostId === post.platformPostId
            )
            .map((item) => ({ date: item.date, value: item.views }))
        ),
      }
    })
  }

  /**
   * The whole profile in three requests, however many accounts it has:
   * followers per account, and post totals per platform for the period and
   * the one before it.
   */
  getOverview(
    profileId: string,
    range: InsightRange,
    previous: InsightRange
  ): Promise<ProfileOverview | InsightsUnavailable> {
    return available(async () => {
      const client = this.zernio()
      const daily = (dates: InsightRange) =>
        request("load channel performance", () =>
          client.analytics.getDailyMetrics({
            throwOnError: true,
            query: { profileId, ...dates },
          })
        )
      const [dashboard, current, before] = await Promise.all([
        request("load followers", () =>
          client.analytics.getAnalyticsDashboard({
            throwOnError: true,
            query: {
              profileId,
              platform: "all",
              ...range,
              topPosts: 0,
              recentPosts: 0,
            },
          })
        ),
        daily(range),
        daily(previous),
      ])
      if (
        [current, before].some(
          (result) =>
            "hasAnalyticsAccess" in result &&
            result.hasAnalyticsAccess === false
        )
      )
        return { status: "not_enabled" }
      return {
        status: "ready",
        followers: (dashboard.followers?.byAccount ?? []).flatMap((item) =>
          item.accountId
            ? [
                {
                  accountId: item.accountId,
                  current: number(item.current),
                  // Followers can be lost, so a change may be negative.
                  gained:
                    typeof item.gained === "number" &&
                    Number.isFinite(item.gained)
                      ? item.gained
                      : null,
                },
              ]
            : []
        ),
        current: platformTotals(current),
        previous: platformTotals(before),
        updatedAt: dashboard.dataAsOf ?? null,
      }
    })
  }

  /**
   * A platform without account insights is summed from its posts: their
   * lifetime metrics, by the day each was published.
   */
  private async channelReport(
    account: InsightAccount,
    platform: ChannelReport["platform"],
    range: InsightRange,
    query: Pick<InsightQuery, "page" | "sort">
  ): Promise<InsightReport> {
    const [result, content] = await Promise.all([
      request("load daily performance", () =>
        this.zernio().analytics.getDailyMetrics({
          throwOnError: true,
          query: {
            profileId: account.profileId,
            accountId: account.accountId,
            platform,
            ...range,
          },
        })
      ),
      this.readContent(account, range, query),
    ])
    if (content.status !== "ready") return content
    if ("hasAnalyticsAccess" in result && result.hasAnalyticsAccess === false)
      return { status: "not_enabled" }
    const days = result.dailyData ?? []
    const breakdown = result.platformBreakdown ?? []
    if (
      breakdown.some((item) => item.platform !== platform) ||
      days.some((day) =>
        Object.entries(day.platforms ?? {}).some(
          ([key, count]) => key !== platform && count > 0
        )
      )
    )
      throw new ProviderError(
        "Couldn't load daily performance. The response included another platform."
      )
    const rules = PLATFORM_RULES[platform]
    const reported = (metric: ChannelMetric, value: unknown) =>
      rules.metrics.includes(metric) ? number(value) : null
    const sums = breakdown[0]
    return {
      ...content,
      platform,
      totals: Object.fromEntries(
        CHANNEL_METRICS.map((metric) => [
          metric,
          reported(metric, sums?.[metric]),
        ])
      ) as ChannelReport["totals"],
      postCount: number(sums?.postCount) ?? 0,
      dailyMetric: rules.primaryMetric,
      daily: series(
        range,
        days.map((day) => ({
          date: day.date,
          value: day.metrics?.[rules.primaryMetric],
        }))
      ),
    }
  }

  private async readContent(
    account: InsightAccount,
    range: InsightRange,
    query: Pick<InsightQuery, "page" | "sort">
  ): Promise<InsightContentReport> {
    const result = await request("load post performance", () =>
      this.zernio().analytics.getAnalytics({
        throwOnError: true,
        query: {
          profileId: account.profileId,
          accountId: account.accountId,
          platform: account.platform,
          ...range,
          page: query.page,
          limit: PAGE_SIZE,
          sortBy: query.sort,
          order: "desc",
        },
      })
    )
    if ("hasAnalyticsAccess" in result && result.hasAnalyticsAccess === false)
      return { status: "not_enabled" }
    if (!("posts" in result) && !("pagination" in result))
      throw new ProviderError(
        "Couldn't load post performance. The response was not a list."
      )
    const list = result as AnalyticsListResponse
    return {
      status: "ready",
      platform: account.platform,
      range,
      posts: (list.posts ?? []).map((post) => listedPost(post, account)),
      page: list.pagination?.page ?? query.page,
      pages: list.pagination?.pages ?? 1,
      totalPosts: list.pagination?.total ?? list.posts?.length ?? 0,
      contentUpdatedAt: list.overview?.lastSync ?? null,
    }
  }

  private async canRead(accountId: string): Promise<boolean> {
    const health = await request("check analytics access", () =>
      this.zernio().accounts.getAccountHealth({
        throwOnError: true,
        path: { accountId },
      })
    )
    if (typeof health.permissions?.canFetchAnalytics !== "boolean")
      throw new ProviderError(
        "Couldn't check analytics access. The response had no permissions."
      )
    return health.permissions.canFetchAnalytics
  }
}

function platformTotals(result: GetDailyMetricsResponse): PlatformTotals[] {
  return (result.platformBreakdown ?? []).flatMap((item) =>
    item.platform
      ? [
          {
            platform: item.platform,
            posts: number(item.postCount) ?? 0,
            metrics: Object.fromEntries(
              CHANNEL_METRICS.map((metric) => [metric, number(item[metric])])
            ) as PlatformTotals["metrics"],
          },
        ]
      : []
  )
}

async function available<T>(
  work: () => Promise<T>
): Promise<T | InsightsUnavailable> {
  try {
    return await work()
  } catch (error) {
    const cause = causeOf(error)
    if (
      hasStatus(cause, 402) ||
      (cause instanceof ZernioApiError &&
        cause.statusCode === 403 &&
        cause.body &&
        "requiresAddon" in cause.body &&
        cause.body.requiresAddon === true)
    )
      return { status: "not_enabled" }
    if (hasStatus(cause, 401) || hasStatus(cause, 403) || hasStatus(cause, 412))
      return { status: "reconnect_required" }
    throw error
  }
}

function listedPost(post: ListedPost, account: InsightAccount): InsightPost {
  const platform = post.platforms?.find(
    (item) =>
      item.platform === account.platform && item.accountId === account.accountId
  )
  if (
    (post.profileId && post.profileId !== account.profileId) ||
    (post.platforms?.length && !platform) ||
    (post.platform && post.platform !== account.platform)
  )
    throw new ProviderError(
      "Couldn't load post performance. A post belonged to another account."
    )
  if (!post._id)
    throw new ProviderError("Couldn't load post performance. A post had no id.")
  return toPost(account.platform, {
    id: post._id,
    platformPostId: platform?.platformPostId ?? null,
    content: post.content,
    publishedAt: post.publishedAt,
    permalink: platform?.platformPostUrl ?? post.platformPostUrl,
    thumbnailUrl: post.thumbnailUrl,
    mediaType: post.mediaType,
    mediaProductType: post.mediaProductType,
    analytics: platform
      ? platform.syncStatus === "pending" ||
        platform.syncStatus === "unavailable"
        ? null
        : platform.analytics
      : post.analytics,
  })
}

function toPost(
  platform: Platform,
  input: {
    id: string
    platformPostId: string | null
    content?: string
    publishedAt?: string | null
    permalink?: string | null
    thumbnailUrl?: string | null
    mediaType?: string | null
    mediaProductType?: string
    analytics?: PostAnalytics | null
  }
): InsightPost {
  const kind = kindOf(platform, input.mediaType, input.mediaProductType)
  return {
    id: input.id,
    platformPostId: input.platformPostId,
    caption: input.content || null,
    publishedAt: input.publishedAt ?? null,
    permalink: httpsUrl(input.permalink),
    thumbnailUrl: httpsUrl(input.thumbnailUrl),
    kind,
    metrics: metrics(platform, input.analytics, kind === "reel"),
    updatedAt: input.analytics?.lastUpdated ?? null,
  }
}

function kindOf(
  platform: Platform,
  mediaType: string | null | undefined,
  mediaProductType: string | undefined
): InsightPost["kind"] {
  if (platform !== "instagram")
    return mediaType === "video"
      ? "video"
      : mediaType === "carousel"
        ? "carousel"
        : "post"
  return mediaProductType === "STORY"
    ? "story"
    : mediaProductType === "REELS"
      ? "reel"
      : mediaType === "carousel"
        ? "carousel"
        : mediaProductType === "FEED" || mediaType === "image"
          ? "post"
          : "unknown"
}

function metrics(
  platform: Platform,
  data: PostAnalytics | null | undefined,
  reel: boolean
): InsightMetrics {
  // A platform reports zero for what it does not measure, which is unknown.
  const reported = PLATFORM_RULES[platform].metrics
  const metric = (name: ChannelMetric) =>
    reported.includes(name) ? number(data?.[name]) : null
  const likes = metric("likes")
  const comments = metric("comments")
  const saves = metric("saves")
  const shares = metric("shares")
  const reach = metric("reach")
  return {
    impressions: metric("impressions"),
    views: metric("views"),
    reach,
    likes,
    comments,
    saves,
    shares,
    clicks: metric("clicks"),
    reposts: platform === "instagram" ? number(data?.reposts) : null,
    engagementRate:
      reach &&
      likes !== null &&
      comments !== null &&
      saves !== null &&
      shares !== null
        ? ((likes + comments + saves + shares) / reach) * 100
        : null,
    averageWatchSeconds: reel ? seconds(data?.igReelsAvgWatchTime) : null,
    totalWatchSeconds: reel ? seconds(data?.igReelsVideoViewTotalTime) : null,
    skipRate:
      reel &&
      number(data?.reelsSkipRate) !== null &&
      data!.reelsSkipRate! <= 100
        ? data!.reelsSkipRate!
        : null,
  }
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null
}

function seconds(value: unknown): number | null {
  const milliseconds = number(value)
  return milliseconds === null ? null : milliseconds / 1000
}

function httpsUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).protocol === "https:" ? value : null
  } catch {
    return null
  }
}

function series(
  range: InsightRange,
  values: { date?: string; value?: number }[]
): InsightPoint[] {
  const byDay = new Map(
    values.map((item) => [item.date?.slice(0, 10), number(item.value)])
  )
  const points: InsightPoint[] = []
  const day = new Date(`${range.fromDate}T00:00:00Z`)
  while (day.toISOString().slice(0, 10) <= range.toDate) {
    const date = day.toISOString().slice(0, 10)
    points.push({ date, value: byDay.get(date) ?? null })
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return points
}
