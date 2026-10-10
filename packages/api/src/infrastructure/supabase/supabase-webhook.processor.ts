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
import { optional, required } from "./query"

export class SupabaseWebhookProcessor implements WebhookProcessor {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly instagram: Pick<InstagramProvider, "disconnectAccount">
  ) {}
  async process(event: InboundEvent): Promise<WebhookReceipt> {
    const outcome = required(
      await this.db.rpc("process_account_webhook", {
        p_id: event.id,
        p_type: event.type,
        p_kind: event.kind,
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
    if (
      event.kind === "account_connected" &&
      event.account.platform === "instagram"
    ) {
      const workspace = optional(
        await this.db
          .from("workspaces")
          .select("id")
          .eq("zernio_profile_id", event.account.providerProfileId)
          .maybeSingle(),
        "find the connected account's workspace"
      )
      if (workspace) {
        const rejected = optional(
          await this.db
            .from("instagram_accounts")
            .select("id")
            .eq("workspace_id", workspace.id)
            .eq("zernio_account_id", event.account.providerAccountId)
            .eq("status", "disconnected")
            .eq("disconnect_reason", DISCONNECT_REASONS.planLimit)
            .maybeSingle(),
          "check the account's plan limit"
        )
        if (rejected)
          await this.instagram.disconnectAccount(
            event.account.providerAccountId
          )
      }
    }
    return outcome
  }
}
