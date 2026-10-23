import type {
  InsightPostReport,
  InsightQuery,
  InsightRange,
  InsightReport,
  InsightContentReport,
  InsightTimingData,
  InsightsUnavailable,
} from "../../contract/insights"
import type { Platform } from "../../contract/platform"

export type InsightAccount = {
  profileId: string
  accountId: string
  platform: Platform
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
}
