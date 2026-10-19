import type {
  InsightPostReport,
  InsightQuery,
  InsightRange,
  InsightReport,
  InsightContentReport,
  InsightTimingData,
  InsightsUnavailable,
} from "../../contract/insights"

export type InsightAccount = {
  profileId: string
  accountId: string
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
