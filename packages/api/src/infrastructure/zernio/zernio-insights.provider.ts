import type {
  AnalyticsListResponse,
  AnalyticsSinglePostResponse,
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
// The largest page Zernio's post analytics returns.
const MAX_PAGE_SIZE = 100
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
   * The whole profile, however many accounts it has: followers per account,
   * and the posts each platform published in the period and the one before,
   * summed from Zernio's latest sync of each post.
   */
  getOverview(
    profileId: string,
    range: InsightRange,
    previous: InsightRange
  ): Promise<ProfileOverview | InsightsUnavailable> {
    return available(async () => {
      const [followers, current, before] = await Promise.all([
        request("load followers", () =>
          this.zernio().accounts.getFollowerStats({
            throwOnError: true,
            query: { profileId, ...range, granularity: "daily" },
          })
        ),
        this.allPosts({ profileId }, range),
        this.allPosts({ profileId }, previous),
      ])
      if (current.status !== "ready") return current
      if (before.status !== "ready") return before
      return {
        status: "ready",
        followers: (followers.accounts ?? []).flatMap((item) =>
          item._id
            ? [
                {
                  accountId: item._id,
                  current: number(item.currentFollowers),
                  // A change needs two daily counts: a new account has one.
                  // Followers can be lost, so a change may be negative.
                  gained:
                    (item.dataPoints ?? 0) >= 2 &&
                    typeof item.growth === "number" &&
                    Number.isFinite(item.growth)
                      ? item.growth
                      : null,
                },
              ]
            : []
        ),
        current: platformTotals(current.posts),
        previous: platformTotals(before.posts),
        updatedAt: current.lastSync,
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
    const [all, content] = await Promise.all([
      this.allPosts(account, range),
      this.readContent(account, range, query),
    ])
    if (content.status !== "ready") return content
    if (all.status !== "ready") return all
    const posts = all.posts.map((post) => listedPost(post, account))
    const rules = PLATFORM_RULES[platform]
    const sum = (values: (number | null)[]) => {
      const known = values.filter((value) => value !== null)
      // No post is a sum of zero; posts not yet measured are unknown.
      return posts.length === 0
        ? 0
        : known.length === 0
          ? null
          : known.reduce((total, value) => total + value, 0)
    }
    const byDay = new Map<string, number[]>()
    for (const post of posts) {
      const value = post.metrics[rules.primaryMetric]
      const day = post.publishedAt?.slice(0, 10)
      if (day && value !== null)
        byDay.set(day, [...(byDay.get(day) ?? []), value])
    }
    return {
      ...content,
      platform,
      totals: Object.fromEntries(
        CHANNEL_METRICS.map((metric) => [
          metric,
          rules.metrics.includes(metric)
            ? sum(posts.map((post) => post.metrics[metric]))
            : null,
        ])
      ) as ChannelReport["totals"],
      postCount: posts.length,
      dailyMetric: rules.primaryMetric,
      daily: series(
        range,
        [...byDay].map(([date, values]) => ({
          date,
          value: values.reduce((total, value) => total + value, 0),
        }))
      ),
    }
  }

  /**
   * Every post the query matches in the period, a page at a time: totals
   * read from the posts follow Zernio's latest sync of each one.
   */
  private async allPosts(
    query: { profileId: string; accountId?: string },
    range: InsightRange
  ): Promise<
    | { status: "ready"; posts: ListedPost[]; lastSync: string | null }
    | InsightsUnavailable
  > {
    const posts: ListedPost[] = []
    for (let page = 1; ; page++) {
      const result = await request("load post performance", () =>
        this.zernio().analytics.getAnalytics({
          throwOnError: true,
          query: {
            profileId: query.profileId,
            accountId: query.accountId,
            ...range,
            page,
            limit: MAX_PAGE_SIZE,
            sortBy: "date",
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
      posts.push(...(list.posts ?? []))
      if (page >= (list.pagination?.pages ?? 1))
        return {
          status: "ready",
          posts,
          lastSync: list.overview?.lastSync ?? null,
        }
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
        // No platform filter: Zernio answers it from older data, and the
        // account already decides the platform.
        query: {
          profileId: account.profileId,
          accountId: account.accountId,
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

/** Each platform's posts and the sum of their metrics, as far as synced. */
function platformTotals(posts: ListedPost[]): PlatformTotals[] {
  const byPlatform = new Map<string, PlatformTotals>()
  for (const post of posts) {
    const copies = post.platforms?.length
      ? post.platforms.map((item) => ({
          platform: item.platform,
          analytics:
            item.syncStatus === "pending" || item.syncStatus === "unavailable"
              ? null
              : item.analytics,
        }))
      : [{ platform: post.platform, analytics: post.analytics }]
    for (const copy of copies) {
      if (!copy.platform) continue
      const totals = byPlatform.get(copy.platform) ?? {
        platform: copy.platform,
        posts: 0,
        metrics: Object.fromEntries(
          CHANNEL_METRICS.map((metric) => [metric, null])
        ) as PlatformTotals["metrics"],
      }
      totals.posts += 1
      for (const metric of CHANNEL_METRICS) {
        const value = number(copy.analytics?.[metric])
        if (value !== null)
          totals.metrics[metric] = (totals.metrics[metric] ?? 0) + value
      }
      byPlatform.set(copy.platform, totals)
    }
  }
  return [...byPlatform.values()]
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
