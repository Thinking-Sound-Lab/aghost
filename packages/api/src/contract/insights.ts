import { z } from "zod"

import type { ChannelMetric, Platform } from "./platform"

export const INSIGHT_PERIODS = [7, 30, 90] as const
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number]

const periodSchema = z.union([z.literal(7), z.literal(30), z.literal(90)])

/** Typed tool inputs; HTTP query strings are converted at the REST boundary. */
export const insightInputSchema = z.object({
  accountId: z
    .uuid()
    .describe(
      "Workspace account ID returned by list_accounts, on any platform."
    ),
  days: periodSchema.default(30).describe("UTC days including today."),
  page: z.number().int().min(1).max(10_000).default(1),
  sort: z
    .enum([
      "views",
      "reach",
      "saves",
      "shares",
      "date",
      "impressions",
      "likes",
      "comments",
      "clicks",
    ])
    .default("views")
    .describe(
      "Sort by a metric the account's platform reports, or by date, newest first."
    ),
})

export const insightQuerySchema = insightInputSchema.extend({
  days: z.coerce
    .number()
    .pipe(insightInputSchema.shape.days.unwrap())
    .default(30),
  page: z.coerce
    .number()
    .pipe(insightInputSchema.shape.page.unwrap())
    .default(1),
})

export const insightPostQuerySchema = insightQuerySchema.pick({
  accountId: true,
  days: true,
})

export const insightTimingQuerySchema = insightQuerySchema.pick({
  accountId: true,
})

/** A minimum sample, not a claim of statistical confidence. */
export const INSIGHT_TIMING_MIN_POSTS = 3

export type InsightTimingSlot = {
  /** Monday = 0, Sunday = 6. The source buckets are in UTC. */
  dayOfWeek: number
  hour: number
  /** Average likes + comments + shares + saves per post. */
  averageEngagement: number
  postCount: number
}

export type InsightTimingData = {
  status: "ready"
  slots: InsightTimingSlot[]
}

export type InsightTimingReport =
  | InsightsUnavailable
  | (InsightTimingData & {
      /** Anchor for converting the next occurrence of each UTC slot. */
      referenceTime: string
    })

export type InsightQuery = z.infer<typeof insightQuerySchema>
export type InsightPostQuery = z.infer<typeof insightPostQuerySchema>
export type InsightRange = { fromDate: string; toDate: string }

/** Missing data stays null: it is different from a reported zero. */
export type InsightPoint = { date: string; value: number | null }

/** Metrics the account's platform does not report stay null. */
export type InsightMetrics = {
  impressions: number | null
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  saves: number | null
  shares: number | null
  clicks: number | null
  reposts: number | null
  /** (likes + comments + saves + shares) / reach * 100. */
  engagementRate: number | null
  averageWatchSeconds: number | null
  totalWatchSeconds: number | null
  skipRate: number | null
}

export type InsightPost = {
  id: string
  platformPostId: string | null
  caption: string | null
  permalink: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  kind: "reel" | "post" | "carousel" | "story" | "video" | "unknown"
  metrics: InsightMetrics
  updatedAt: string | null
}

export type InsightsUnavailable = {
  status: "reconnect_required" | "not_enabled"
}

type ContentPage = {
  status: "ready"
  platform: Platform
  range: InsightRange
  /** Posts published in the range, with their lifetime metrics. */
  posts: InsightPost[]
  page: number
  pages: number
  totalPosts: number
  contentUpdatedAt: string | null
}

/** Instagram's account report, from its account insights. */
type InstagramReport = ContentPage & {
  platform: "instagram"
  /** Account-wide totals for the selected dates, never summed post reach. */
  summary: {
    views: number | null
    reach: number | null
    accountsEngaged: number | null
    totalInteractions: number | null
  }
  dailyReach: InsightPoint[]
}

/**
 * Another platform's report, built from its posts: totals are the lifetime
 * metrics of the posts published in the range, and each day holds the posts
 * published that day.
 */
export type ChannelReport = ContentPage & {
  platform: Exclude<Platform, "instagram">
  totals: Record<ChannelMetric, number | null>
  postCount: number
  dailyMetric: ChannelMetric
  daily: InsightPoint[]
}

export type InsightReport =
  InsightsUnavailable | InstagramReport | ChannelReport

export type InsightPostReport =
  | InsightsUnavailable
  | {
      status: "ready"
      post: InsightPost
      /** Daily snapshots of the post's cumulative view count. */
      views: InsightPoint[]
    }

/** One page of the content table, without the account summary. */
export type InsightContentReport = InsightsUnavailable | ContentPage
