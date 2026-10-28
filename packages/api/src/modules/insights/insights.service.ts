import type {
  InsightOverview,
  InsightOverviewQuery,
  InsightOverviewChannel,
  InsightOverviewTotals,
  InsightPostQuery,
  InsightPostReport,
  InsightQuery,
  InsightRange,
  InsightReport,
  InsightPeriod,
  InsightTimingReport,
  InsightContentReport,
} from "../../contract/insights"
import {
  CHANNEL_METRICS,
  PLATFORMS,
  PLATFORM_RULES,
  type Platform,
} from "../../contract/platform"
import type { AccountRepository } from "../accounts/account.repository"
import type { SocialSetRecord } from "../social-sets/social-set"
import type { WorkspaceRecord } from "../workspaces/workspace"
import { NotFoundError } from "../../shared/errors"
import type {
  InsightAccount,
  InsightsProvider,
  PlatformTotals,
} from "./insights.provider"

/** Finds the social set an overview covers. */
export interface InsightSocialSets {
  resolve(
    workspace: WorkspaceRecord,
    id: string | undefined
  ): Promise<SocialSetRecord>
}

export class InsightsService {
  constructor(
    private readonly provider: InsightsProvider,
    private readonly accounts: Pick<
      AccountRepository,
      "findById" | "listByWorkspace"
    >,
    private readonly sets: InsightSocialSets,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getContent(
    workspace: WorkspaceRecord,
    query: InsightQuery
  ): Promise<InsightContentReport> {
    const account = await this.account(workspace, query.accountId)
    if (!account) return { status: "reconnect_required" }
    return this.provider.getContent(account, this.range(query.days), query)
  }

  async getPostingTimes(
    workspace: WorkspaceRecord,
    query: Pick<InsightQuery, "accountId">
  ): Promise<InsightTimingReport> {
    const account = await this.account(workspace, query.accountId)
    if (!account) return { status: "reconnect_required" }
    const result = await this.provider.getPostingTimes(account)
    return result.status === "ready"
      ? { ...result, referenceTime: this.now().toISOString() }
      : result
  }

  async getReport(
    workspace: WorkspaceRecord,
    query: InsightQuery
  ): Promise<InsightReport> {
    const account = await this.account(workspace, query.accountId)
    if (!account) return { status: "reconnect_required" }
    return this.provider.getReport(account, this.range(query.days), query)
  }

  async getPost(
    workspace: WorkspaceRecord,
    postId: string,
    query: InsightPostQuery
  ): Promise<InsightPostReport> {
    const account = await this.account(workspace, query.accountId)
    if (!account) return { status: "reconnect_required" }
    return this.provider.getPost(account, postId, this.range(query.days))
  }

  /**
   * A social set's connected channels, grouped by platform, for the period
   * and the one before it: followers per account, and the posts each
   * platform published.
   */
  async getOverview(
    workspace: WorkspaceRecord,
    query: InsightOverviewQuery
  ): Promise<InsightOverview> {
    const { days } = query
    const range = this.range(days)
    const end = new Date(`${range.fromDate}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() - 1)
    const previousRange = this.range(days, end)
    const set = await this.sets.resolve(workspace, query.socialSetId)
    const accounts = (await this.accounts.listByWorkspace(workspace.id)).filter(
      (account) =>
        account.socialSetId === set.id && account.status === "connected"
    )
    const platforms = PLATFORMS.filter((platform) =>
      accounts.some((account) => account.platform === platform)
    )
    if (platforms.length === 0)
      return {
        status: "ready",
        range,
        previousRange,
        followers: null,
        followersGained: null,
        totals: totalsOf([], []),
        previousTotals: totalsOf([], []),
        channels: [],
        updatedAt: null,
      }
    // A set's accounts arrive through its profile, so it has one by now.
    if (!set.providerProfileId) throw new NotFoundError("Provider profile")
    const result = await this.provider.getOverview(
      set.providerProfileId,
      range,
      previousRange
    )
    if (result.status !== "ready") return result
    const followers = new Map(
      result.followers.map((item) => [item.accountId, item])
    )
    const channels = platforms.map((platform): InsightOverviewChannel => {
      const owned = accounts.filter((account) => account.platform === platform)
      const counts = owned.map((account) =>
        followers.get(account.providerAccountId)
      )
      const totals = platformTotals(platform, result.current)
      return {
        platform,
        accountIds: owned.map((account) => account.id),
        followers: sum(counts.map((count) => count?.current ?? null)),
        followersGained: sum(counts.map((count) => count?.gained ?? null)),
        posts: totals.posts,
        engagements: engagementsOf(totals.metrics),
        metrics: totals.metrics,
      }
    })
    return {
      status: "ready",
      range,
      previousRange,
      followers: sum(channels.map((channel) => channel.followers)),
      followersGained: sum(channels.map((channel) => channel.followersGained)),
      totals: totalsOf(platforms, result.current),
      previousTotals: totalsOf(platforms, result.previous),
      channels,
      updatedAt: result.updatedAt,
    }
  }

  private async account(
    workspace: WorkspaceRecord,
    id: string
  ): Promise<InsightAccount | null> {
    const account = await this.accounts.findById(workspace.id, id)
    if (!account) throw new NotFoundError("Account")
    if (account.status !== "connected") return null
    if (!account.providerProfileId) throw new NotFoundError("Provider profile")
    return {
      profileId: account.providerProfileId,
      accountId: account.providerAccountId,
      platform: account.platform,
    }
  }

  private range(days: InsightPeriod, end = this.now()): InsightRange {
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - days + 1)
    return {
      fromDate: start.toISOString().slice(0, 10),
      toDate: end.toISOString().slice(0, 10),
    }
  }
}

/** The known values added up; null when none is known. */
function sum(values: (number | null)[]): number | null {
  const known = values.filter((value) => value !== null)
  return known.length === 0
    ? null
    : known.reduce((total, value) => total + value, 0)
}

/**
 * A platform's totals with only the metrics it reports. A platform the
 * provider left out published nothing in the period, so its sums are zero.
 */
function platformTotals(
  platform: Platform,
  list: PlatformTotals[]
): Omit<PlatformTotals, "platform"> {
  const found = list.find((item) => item.platform === platform)
  const { metrics } = PLATFORM_RULES[platform]
  return {
    posts: found?.posts ?? 0,
    metrics: Object.fromEntries(
      CHANNEL_METRICS.map((metric) => [
        metric,
        metrics.includes(metric) ? (found ? found.metrics[metric] : 0) : null,
      ])
    ) as PlatformTotals["metrics"],
  }
}

const ENGAGEMENT = ["likes", "comments", "shares", "saves"] as const

function engagementsOf(metrics: PlatformTotals["metrics"]): number | null {
  return sum(ENGAGEMENT.map((metric) => metrics[metric]))
}

function totalsOf(
  platforms: Platform[],
  list: PlatformTotals[]
): InsightOverviewTotals {
  const totals = platforms.map((platform) => platformTotals(platform, list))
  return {
    posts: totals.reduce((total, item) => total + item.posts, 0),
    views: sum(totals.map((item) => item.metrics.views)),
    engagements: sum(totals.map((item) => engagementsOf(item.metrics))),
  }
}
