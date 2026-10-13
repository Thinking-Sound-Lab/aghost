import { randomUUID } from "node:crypto"
import type { FollowUp } from "../../contract/automation"
import type { Plan } from "../../contract/billing"
import type { AccountRecord } from "../accounts/account"
import { supportsAutomation } from "../billing/plan-entitlements"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import type { AutomationRecord } from "./automation"

export type FollowUpJob = {
  id: string
  automationId: string
  workspaceId: string
  providerAccountId: string
  recipientId: string
  conversationId: string
  sourceSentAt: string
  automationUpdatedAt: string
  followUp: FollowUp
  attempts: number
}
export type FollowUpContext = {
  automation: AutomationRecord
  account: AccountRecord
  plan: Plan | null
}
export type FollowUpCheck = { logId: string | null; reason: string | null }
export interface FollowUpRepository {
  claim(owner: string): Promise<FollowUpJob[]>
  load(job: FollowUpJob): Promise<FollowUpContext | null>
  stillClaimed(jobId: string, owner: string): Promise<boolean>
  finish(
    jobId: string,
    owner: string,
    status: "sent" | "cancelled",
    reason: string | null,
    logId: string | null
  ): Promise<void>
  retry(job: FollowUpJob, owner: string): Promise<void>
}
export interface FollowUpProvider {
  check(
    job: FollowUpJob,
    automation: AutomationRecord,
    now: Date
  ): Promise<FollowUpCheck>
  send(job: FollowUpJob, idempotencyKey: string): Promise<void>
}

/** One reminder per original DM. Timers and retry ownership live in Postgres. */
export class FollowUpService {
  constructor(
    private readonly jobs: FollowUpRepository,
    private readonly provider: FollowUpProvider,
    private readonly operations: WorkspaceOperations,
    private readonly now: () => Date = () => new Date()
  ) {}

  async run(onError: (error: unknown, jobId: string) => void): Promise<void> {
    const owner = randomUUID()
    for (const job of await this.jobs.claim(owner)) {
      try {
        await this.operations.run(job.workspaceId, () =>
          this.deliver(job, owner)
        )
      } catch (error) {
        onError(error, job.id)
        await this.jobs.retry(job, owner)
      }
    }
  }

  private async deliver(job: FollowUpJob, owner: string): Promise<void> {
    if (!(await this.jobs.stillClaimed(job.id, owner))) return
    const context = await this.jobs.load(job)
    const cancel = (reason: string, logId: string | null = null) =>
      this.jobs.finish(job.id, owner, "cancelled", reason, logId)
    if (!context) return cancel("automation_removed")
    const { automation, account, plan } = context
    if (
      automation.status !== "active" ||
      !automation.followUp ||
      Date.parse(automation.updatedAt) !== Date.parse(job.automationUpdatedAt)
    )
      return cancel("automation_changed")
    if (
      account.status !== "connected" ||
      account.providerAccountId !== job.providerAccountId
    )
      return cancel("account_disconnected")
    if (!plan || !supportsAutomation(plan, automation))
      return cancel("plan_changed")
    const now = this.now()
    const elapsed = now.getTime() - Date.parse(job.sourceSentAt)
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= 24 * 60 * 60_000)
      return cancel("outside_window")
    const check = await this.provider.check(job, automation, now)
    if (check.reason || !check.logId)
      return cancel(check.reason ?? "unverified_delivery", check.logId)
    // A reply webhook may have cancelled this while the provider was read.
    if (!(await this.jobs.stillClaimed(job.id, owner))) return
    await this.provider.send(
      job,
      `aghost-nudge-${automation.id}-${check.logId}`
    )
    await this.jobs.finish(job.id, owner, "sent", null, check.logId)
  }
}
