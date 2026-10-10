import type { Json, Database } from "@workspace/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { InboundEvent } from "../../modules/webhooks/inbound-event"
import type {
  WebhookProcessor,
  WebhookReceipt,
} from "../../modules/webhooks/webhook.processor"
import { InternalError } from "../../shared/errors"
import { required } from "./query"

export class SupabaseWebhookProcessor implements WebhookProcessor {
  constructor(private readonly db: SupabaseClient<Database>) {}
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
    return outcome
  }
}
