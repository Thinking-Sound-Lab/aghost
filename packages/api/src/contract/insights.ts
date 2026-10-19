import { z } from "zod"

export const INSIGHT_PERIODS = [7, 30, 90] as const
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number]

const periodSchema = z.union([z.literal(7), z.literal(30), z.literal(90)])

/** Typed tool inputs; HTTP query strings are converted at the REST boundary. */
export const insightInputSchema = z.object({
  accountId: z
    .uuid()
    .describe("Workspace account ID returned by list_accounts."),
  days: periodSchema.default(30).describe("UTC days including today."),
  page: z.number().int().min(1).max(10_000).default(1),
  sort: z.enum(["views", "reach", "saves", "shares", "date"]).default("views"),
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

export type InsightMetrics = {
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  saves: number | null
  shares: number | null
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
  kind: "reel" | "post" | "carousel" | "story" | "unknown"
  metrics: InsightMetrics
  updatedAt: string | null
}

export type InsightsUnavailable = {
  status: "reconnect_required" | "not_enabled"
}

export type InsightReport =
  | InsightsUnavailable
  | {
      status: "ready"
      range: InsightRange
      /** Account-wide totals for the selected dates, never summed post reach. */
      summary: {
        views: number | null
        reach: number | null
        accountsEngaged: number | null
        totalInteractions: number | null
      }
      dailyReach: InsightPoint[]
      /** Posts published in the range, with their lifetime metrics. */
      posts: InsightPost[]
      page: number
      pages: number
      totalPosts: number
      contentUpdatedAt: string | null
    }

export type InsightPostReport =
  | InsightsUnavailable
  | {
      status: "ready"
      post: InsightPost
      /** Daily snapshots of the post's cumulative view count. */
      views: InsightPoint[]
    }

export type InsightContentReport =
  | InsightsUnavailable
  | Pick<
      Extract<InsightReport, { status: "ready" }>,
      | "status"
      | "range"
      | "posts"
      | "page"
      | "pages"
      | "totalPosts"
      | "contentUpdatedAt"
    >
