import type {
  InsightPostQuery,
  InsightPostReport,
  InsightQuery,
  InsightRange,
  InsightReport,
  InsightPeriod,
  InsightTimingReport,
} from "../../contract/insights"
import type { AccountRepository } from "../accounts/account.repository"
import type { WorkspaceRecord } from "../workspaces/workspace"
import { NotFoundError } from "../../shared/errors"
import type { InsightAccount, InsightsProvider } from "./insights.provider"

export class InsightsService {
  constructor(
    private readonly provider: InsightsProvider,
    private readonly accounts: Pick<AccountRepository, "findById">,
    private readonly now: () => Date = () => new Date()
  ) {}

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

  private async account(
    workspace: WorkspaceRecord,
    id: string
  ): Promise<InsightAccount | null> {
    const account = await this.accounts.findById(workspace.id, id)
    if (!account) throw new NotFoundError("Instagram account")
    if (account.status !== "connected") return null
    if (!workspace.providerProfileId)
      throw new NotFoundError("Instagram profile")
    return {
      profileId: workspace.providerProfileId,
      accountId: account.providerAccountId,
    }
  }

  private range(days: InsightPeriod): InsightRange {
    const end = this.now()
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - days + 1)
    return {
      fromDate: start.toISOString().slice(0, 10),
      toDate: end.toISOString().slice(0, 10),
    }
  }
}
