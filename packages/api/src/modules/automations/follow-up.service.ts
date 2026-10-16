import { randomUUID } from "node:crypto"
import type { FollowUp } from "../../contract/automation"
import type { Plan } from "../../contract/billing"
import type { AccountRecord } from "../accounts/account"
import { supportsAutomation } from "../billing/plan-entitlements"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import type { AutomationRecord } from "./automation"
import { ConflictError } from "../../shared/errors"

/** A successful provider response, retained if saving the final status fails. */
export type FollowUpReceipt = {
  logId: string
  messageId: string | null
  sentAt: string
}

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
  deliveryReceipt: FollowUpReceipt | null
}
export type FollowUpContext = {
  automation: AutomationRecord
  account: AccountRecord
  plan: Plan | null
}
export type FollowUpCheck = {
  logId: string | null
  reason: string | null
  validUntil?: number
}
export interface FollowUpRepository {
  claim(owner: string): Promise<FollowUpJob[]>
  load(job: FollowUpJob): Promise<FollowUpContext | null>
  stillClaimed(jobId: string, owner: string): Promise<boolean>
  finish(
    jobId: string,
    owner: string,
    status: "sent" | "cancelled",
    reason: string | null,
    logId: string | null,
    receipt?: FollowUpReceipt
  ): Promise<void>
  retry(
    job: FollowUpJob,
    owner: string,
    receipt?: FollowUpReceipt
  ): Promise<void>
  defer(job: FollowUpJob, owner: string): Promise<void>
}
export interface FollowUpProvider {
  check(
    job: FollowUpJob,
    automation: AutomationRecord,
    now: Date
  ): Promise<FollowUpCheck>
  send(job: FollowUpJob, idempotencyKey: string): Promise<string | null>
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
      let entered = false
      let receipt = job.deliveryReceipt
      try {
        // Provider history reads must not hold the workspace's mutation lock.
        const context = receipt ? null : await this.jobs.load(job)
        const reason = receipt ? null : this.ineligible(job, context)
        const check =
          receipt || reason
            ? null
            : await this.provider.check(job, context!.automation, this.now())
        await this.operations.run(job.workspaceId, async () => {
          entered = true
          if (receipt) {
            await this.jobs.finish(
              job.id,
              owner,
              "sent",
              null,
              receipt.logId,
              receipt
            )
            return
          }
          await this.deliver(job, owner, check, (sent) => {
            receipt = sent
          })
        })
      } catch (error) {
        if (!entered && error instanceof ConflictError) {
          await this.jobs.defer(job, owner)
          continue
        }
        onError(error, job.id)
        await this.jobs.retry(job, owner, receipt ?? undefined)
      }
    }
  }

  private ineligible(
    job: FollowUpJob,
    context: FollowUpContext | null
  ): string | null {
    if (!context) return "automation_removed"
    const { automation, account, plan } = context
    if (
      automation.status !== "active" ||
      !automation.followUp ||
      Date.parse(automation.updatedAt) !== Date.parse(job.automationUpdatedAt)
    )
      return "automation_changed"
    if (
      account.status !== "connected" ||
      account.providerAccountId !== job.providerAccountId
    )
      return "account_disconnected"
    if (!plan || !supportsAutomation(plan, automation)) return "plan_changed"
    const elapsed = this.now().getTime() - Date.parse(job.sourceSentAt)
    return !Number.isFinite(elapsed) ||
      elapsed < 0 ||
      elapsed >= 24 * 60 * 60_000
      ? "outside_window"
      : null
  }

  private async deliver(
    job: FollowUpJob,
    owner: string,
    check: FollowUpCheck | null,
    sent: (receipt: FollowUpReceipt) => void
  ): Promise<void> {
    if (!(await this.jobs.stillClaimed(job.id, owner))) return
    const context = await this.jobs.load(job)
    const cancel = (reason: string, logId: string | null = null) =>
      this.jobs.finish(job.id, owner, "cancelled", reason, logId)
    const reason = this.ineligible(job, context)
    if (reason) return cancel(reason)
    if (!check) return cancel("unverified_delivery")
    if (check.reason || !check.logId)
      return cancel(check.reason ?? "unverified_delivery", check.logId)
    if (
      check.validUntil !== undefined &&
      this.now().getTime() >= check.validUntil
    )
      return cancel("outside_window", check.logId)
    // A reply webhook may have cancelled this while the provider was read.
    if (!(await this.jobs.stillClaimed(job.id, owner))) return
    const messageId = await this.provider.send(
      job,
      `aghost-nudge-${job.automationId}-${check.logId}`
    )
    const receipt = {
      logId: check.logId,
      messageId,
      sentAt: this.now().toISOString(),
    }
    sent(receipt)
    await this.jobs.finish(job.id, owner, "sent", null, check.logId, receipt)
  }
}
