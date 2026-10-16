import type { DatabaseClient } from "@workspace/supabase/server"
import {
  followUpSchema,
  type FollowUpActivity,
} from "../../contract/automation"
import { z } from "zod"
import { isEntitled, PLANS } from "../../contract/billing"
import type {
  FollowUpContext,
  FollowUpJob,
  FollowUpRepository,
  FollowUpReceipt,
} from "../../modules/automations/follow-up.service"
import { SupabaseAutomationRepository } from "./supabase-automation.repository"
import { SupabaseAccountRepository } from "./supabase-account.repository"
import { SupabaseBillingRepository } from "./supabase-billing.repository"
import { completed, optional, required } from "./query"

const receiptSchema = z.object({
  logId: z.string(),
  messageId: z.string().nullable(),
  sentAt: z.iso.datetime(),
})

export class SupabaseFollowUpRepository implements FollowUpRepository {
  constructor(private readonly db: DatabaseClient) {}

  async list(
    workspaceId: string,
    automationId: string
  ): Promise<FollowUpActivity[]> {
    const rows = required(
      await this.db
        .from("follow_up_jobs")
        .select("id, status, reason, due_at, sent_at, recipient_name")
        .eq("workspace_id", workspaceId)
        .eq("automation_id", automationId)
        .order("created_at", { ascending: false })
        .limit(50),
      "list the reminders"
    )
    return rows.map((row) => ({
      id: row.id,
      recipient: row.recipient_name,
      status: z
        .enum(["pending", "processing", "sent", "cancelled", "failed"])
        .parse(row.status),
      reason: row.reason,
      dueAt: row.due_at,
      sentAt: row.sent_at,
    }))
  }

  async claim(owner: string): Promise<FollowUpJob[]> {
    return required(
      await this.db.rpc("claim_follow_up_jobs", {
        p_owner: owner,
        p_limit: 20,
      }),
      "claim follow-up reminders"
    ).map((row) => ({
      id: row.id,
      automationId: row.automation_id,
      workspaceId: row.workspace_id,
      providerAccountId: row.provider_account_id,
      recipientId: row.recipient_id,
      conversationId: row.conversation_id,
      sourceSentAt: row.source_sent_at,
      automationUpdatedAt: row.automation_updated_at,
      followUp: followUpSchema.parse(row.follow_up),
      attempts: row.attempts,
      deliveryReceipt: row.delivery_receipt
        ? receiptSchema.parse(row.delivery_receipt)
        : null,
    }))
  }

  async load(job: FollowUpJob): Promise<FollowUpContext | null> {
    const clients = { scoped: this.db, privileged: this.db }
    const automation = await new SupabaseAutomationRepository(clients).findById(
      job.workspaceId,
      job.automationId
    )
    if (!automation) return null
    const [account, billing] = await Promise.all([
      new SupabaseAccountRepository(clients).findById(
        job.workspaceId,
        automation.accountId
      ),
      new SupabaseBillingRepository(clients).findByWorkspace(job.workspaceId),
    ])
    if (!account) return null
    const subscription = billing?.subscription
    return {
      automation,
      account,
      plan:
        subscription && isEntitled(subscription.status)
          ? PLANS[subscription.plan]
          : null,
    }
  }

  async stillClaimed(id: string, owner: string): Promise<boolean> {
    return Boolean(
      optional(
        await this.db
          .from("follow_up_jobs")
          .select("id")
          .eq("id", id)
          .eq("status", "processing")
          .eq("lease_owner", owner)
          .maybeSingle(),
        "check reminder ownership"
      )
    )
  }

  async finish(
    id: string,
    owner: string,
    status: "sent" | "cancelled",
    reason: string | null,
    logId: string | null,
    receipt?: FollowUpReceipt
  ): Promise<void> {
    let query = this.db
      .from("follow_up_jobs")
      .update({
        status,
        reason,
        provider_log_id: logId,
        sent_at:
          status === "sent"
            ? (receipt?.sentAt ?? new Date().toISOString())
            : null,
        ...(receipt && { delivery_receipt: receipt }),
        lease_owner: null,
        lease_until: null,
      })
      .eq("id", id)
    // A reply may cancel a job while its send is already in flight. A
    // confirmed delivery remains a fact even after that cancellation.
    query = receipt
      ? query.in("status", ["processing", "cancelled", "pending", "failed"])
      : query.eq("status", "processing").eq("lease_owner", owner)
    completed(await query, "finish the reminder")
  }

  async retry(
    job: FollowUpJob,
    owner: string,
    receipt?: FollowUpReceipt
  ): Promise<void> {
    let query = this.db
      .from("follow_up_jobs")
      .update({
        status: !receipt && job.attempts >= 5 ? "failed" : "pending",
        reason: receipt ? "saving_delivery" : "delivery_error",
        ...(receipt && { delivery_receipt: receipt }),
        retry_after: new Date(
          Date.now() + Math.min(job.attempts, 5) * 60_000
        ).toISOString(),
        lease_owner: null,
        lease_until: null,
      })
      .eq("id", job.id)
      .eq("workspace_id", job.workspaceId)
    query = receipt
      ? query.neq("status", "sent")
      : query.eq("status", "processing").eq("lease_owner", owner)
    completed(await query, "retry the reminder")
  }

  async defer(job: FollowUpJob, owner: string): Promise<void> {
    completed(
      await this.db
        .from("follow_up_jobs")
        .update({
          status: "pending",
          attempts: Math.max(0, job.attempts - 1),
          reason: "workspace_busy",
          retry_after: new Date(Date.now() + 15_000).toISOString(),
          lease_owner: null,
          lease_until: null,
        })
        .eq("id", job.id)
        .eq("status", "processing")
        .eq("lease_owner", owner),
      "defer a busy workspace's reminder"
    )
  }
}
