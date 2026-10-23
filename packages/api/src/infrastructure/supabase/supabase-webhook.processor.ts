import type { Json, Database } from "@workspace/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { ACCOUNT_STATUSES } from "../../contract/account"
import { PLATFORMS, platformSchema } from "../../contract/platform"
import type { InboundEvent } from "../../modules/webhooks/inbound-event"
import type {
  WebhookProcessor,
  WebhookReceipt,
} from "../../modules/webhooks/webhook.processor"
import { InternalError } from "../../shared/errors"
import {
  accountChange,
  DISCONNECT_REASONS,
  type AccountRecord,
  type AccountState,
} from "../../modules/accounts/account"
import type { AccountProvider } from "../../modules/accounts/account.provider"
import {
  actorOf,
  type ProductAnalytics,
} from "../../modules/analytics/analytics"
import type { WorkspaceOwner } from "../../modules/workspaces/workspace"
import type { WorkspaceOperations } from "../../modules/workspaces/workspace-operations"
import { optional, required } from "./query"

export class SupabaseWebhookProcessor implements WebhookProcessor {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly provider: Pick<AccountProvider, "disconnectAccount">,
    private readonly operations: WorkspaceOperations,
    private readonly analytics: ProductAnalytics
  ) {}
  async process(event: InboundEvent): Promise<WebhookReceipt> {
    if (event.kind === "automation_dm_sent" || event.kind === "dm_received") {
      return required(
        await this.db.rpc("process_follow_up_webhook", {
          p_id: event.id,
          p_type: event.type,
          p_payload: event.payload as Json,
          p_account_id: event.account.providerAccountId,
          p_profile_id: event.account.providerProfileId,
          p_recipient_id: event.message.recipientId,
          p_conversation_id: event.message.conversationId,
          p_message_id: event.message.providerMessageId,
          p_automation_id: event.message.providerAutomationId ?? "",
          p_sent_at: event.message.sentAt,
        }),
        "process the reminder event"
      ) as WebhookReceipt
    }
    const workspace = await this.workspaceOf(event)
    return workspace
      ? this.operations.run(workspace.id, () =>
          this.processOwned(event, workspace)
        )
      : this.processOwned(event, null)
  }

  private async workspaceOf(
    event: InboundEvent
  ): Promise<WorkspaceOwner | null> {
    if (
      event.kind === "unhandled" ||
      event.kind === "automation_dm_sent" ||
      event.kind === "dm_received" ||
      !(PLATFORMS as readonly string[]).includes(event.account.platform)
    )
      return null
    if (event.kind === "account_connected") {
      const workspace = optional(
        await this.db
          .from("workspaces")
          .select("id, owner_id")
          .eq("zernio_profile_id", event.account.providerProfileId)
          .maybeSingle(),
        "find the connected account's workspace"
      )
      return workspace && { id: workspace.id, ownerId: workspace.owner_id }
    }
    const account = optional(
      await this.db
        .from("instagram_accounts")
        .select("workspace_id, workspaces(owner_id)")
        .eq("zernio_account_id", event.account.providerAccountId)
        .maybeSingle(),
      "find the disconnected account's workspace"
    )
    return (
      account && {
        id: account.workspace_id,
        ownerId: account.workspaces.owner_id,
      }
    )
  }

  /** The account as stored in the workspace, with the id the product uses. */
  private async account(
    workspaceId: string,
    providerAccountId: string
  ): Promise<(AccountState & Pick<AccountRecord, "id" | "platform">) | null> {
    const row = optional(
      await this.db
        .from("instagram_accounts")
        .select("id, platform, status, disconnect_reason")
        .eq("workspace_id", workspaceId)
        .eq("zernio_account_id", providerAccountId)
        .maybeSingle(),
      "read the webhook's account"
    )
    return (
      row && {
        id: row.id,
        platform: platformSchema.parse(row.platform),
        status: z.enum(ACCOUNT_STATUSES).parse(row.status),
        disconnectReason: row.disconnect_reason,
      }
    )
  }

  private async processOwned(
    event: InboundEvent,
    workspace: WorkspaceOwner | null
  ): Promise<WebhookReceipt> {
    const owned = event.kind !== "unhandled" && workspace
    const before = owned
      ? await this.account(workspace.id, event.account.providerAccountId)
      : null
    const outcome = required(
      await this.db.rpc("process_account_webhook", {
        p_id: event.id,
        p_type: event.type,
        // An unrelated event still gets its ledger entry, but cannot start
        // mutating a workspace that appeared after the ownership lookup.
        p_kind: workspace ? event.kind : "unhandled",
        p_payload: event.payload as Json,
        p_account: event.kind === "unhandled" ? {} : event.account,
      }),
      "apply the webhook event"
    )
    if (
      outcome !== "processed" &&
      outcome !== "ignored" &&
      outcome !== "duplicate"
    ) {
      throw new InternalError(
        "The webhook transaction returned an unknown outcome."
      )
    }
    if (!owned) return outcome
    const after = await this.account(
      workspace.id,
      event.account.providerAccountId
    )
    if (after && outcome === "processed") {
      const change = accountChange(after, before, after)
      if (change) this.analytics.capture(actorOf(workspace), change)
    }
    // Recheck duplicates too: the DB commit can succeed before the provider
    // disconnect fails. A redelivery then finishes that same cleanup.
    if (
      event.kind === "account_connected" &&
      after?.status === "disconnected" &&
      after.disconnectReason === DISCONNECT_REASONS.planLimit
    )
      await this.provider.disconnectAccount(event.account.providerAccountId)
    return outcome
  }
}
