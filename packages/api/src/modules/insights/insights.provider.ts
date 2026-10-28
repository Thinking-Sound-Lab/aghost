import type {
  InsightPostReport,
  InsightQuery,
  InsightRange,
  InsightReport,
  InsightContentReport,
  InsightTimingData,
  InsightsUnavailable,
} from "../../contract/insights"
import type { ChannelMetric, Platform } from "../../contract/platform"

export type InsightAccount = {
  profileId: string
  accountId: string
  platform: Platform
}

/** A platform's posts published in a period, as the provider sums them. */
export type PlatformTotals = {
  platform: string
  posts: number
  metrics: Record<ChannelMetric, number | null>
}

/** A profile's followers per account and post totals per platform. */
export type ProfileOverview = {
  status: "ready"
  followers: {
    accountId: string
    current: number | null
    gained: number | null
  }[]
  current: PlatformTotals[]
  previous: PlatformTotals[]
  updatedAt: string | null
}

export interface InsightsProvider {
  getContent(
    account: InsightAccount,
    range: InsightRange,
    query: Pick<InsightQuery, "page" | "sort">
  ): Promise<InsightContentReport>
  getPostingTimes(
    account: InsightAccount
  ): Promise<InsightTimingData | InsightsUnavailable>
  getReport(
    account: InsightAccount,
    range: InsightRange,
    query: Pick<InsightQuery, "page" | "sort">
  ): Promise<InsightReport>
  getPost(
    account: InsightAccount,
    postId: string,
    range: InsightRange
  ): Promise<InsightPostReport>
  getOverview(
    profileId: string,
    range: InsightRange,
    previous: InsightRange
  ): Promise<ProfileOverview | InsightsUnavailable>
}
