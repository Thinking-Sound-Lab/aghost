import type { Json, Database } from "@workspace/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { InboundEvent } from "../../modules/webhooks/inbound-event"
import type {
  WebhookProcessor,
  WebhookReceipt,
} from "../../modules/webhooks/webhook.processor"
import { InternalError } from "../../shared/errors"
import { DISCONNECT_REASONS } from "../../modules/accounts/account"
import type { InstagramProvider } from "../../modules/accounts/instagram.provider"
import type { WorkspaceOperations } from "../../modules/workspaces/workspace-operations"
import { optional, required } from "./query"

export class SupabaseWebhookProcessor implements WebhookProcessor {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly instagram: Pick<InstagramProvider, "disconnectAccount">,
    private readonly operations: WorkspaceOperations
  ) {}
  async process(event: InboundEvent): Promise<WebhookReceipt> {
    const workspaceId = await this.workspaceId(event)
    return workspaceId
      ? this.operations.run(workspaceId, () =>
          this.processOwned(event, workspaceId)
        )
      : this.processOwned(event, null)
  }

  private async workspaceId(event: InboundEvent): Promise<string | null> {
    if (event.kind === "unhandled" || event.account.platform !== "instagram")
      return null
    if (event.kind === "account_connected") {
      const workspace = optional(
        await this.db
          .from("workspaces")
          .select("id")
          .eq("zernio_profile_id", event.account.providerProfileId)
          .maybeSingle(),
        "find the connected account's workspace"
      )
      return workspace?.id ?? null
    }
    const account = optional(
      await this.db
        .from("instagram_accounts")
        .select("workspace_id")
        .eq("zernio_account_id", event.account.providerAccountId)
        .maybeSingle(),
      "find the disconnected account's workspace"
    )
    return account?.workspace_id ?? null
  }

  private async processOwned(
    event: InboundEvent,
    workspaceId: string | null
  ): Promise<WebhookReceipt> {
    const outcome = required(
      await this.db.rpc("process_account_webhook", {
        p_id: event.id,
        p_type: event.type,
        // An unrelated event still gets its ledger entry, but cannot start
        // mutating a workspace that appeared after the ownership lookup.
        p_kind: workspaceId ? event.kind : "unhandled",
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
    // Recheck duplicates too: the DB commit can succeed before the provider
    // disconnect fails. A redelivery then finishes that same cleanup.
    if (event.kind === "account_connected" && workspaceId) {
      const rejected = optional(
        await this.db
          .from("instagram_accounts")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("zernio_account_id", event.account.providerAccountId)
          .eq("status", "disconnected")
          .eq("disconnect_reason", DISCONNECT_REASONS.planLimit)
          .maybeSingle(),
        "check the account's plan limit"
      )
      if (rejected)
        await this.instagram.disconnectAccount(event.account.providerAccountId)
    }
    return outcome
  }
}
