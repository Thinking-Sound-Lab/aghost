import { Webhook, WebhookVerificationError } from "standardwebhooks"
import { z } from "zod"

import type {
  BillingEvent,
  BillingWebhookGateway,
} from "../../modules/billing/billing-webhook"
import {
  BadRequestError,
  InvalidWebhookSignatureError,
} from "../../shared/errors"

const eventSchema = z.object({
  type: z.string().min(1),
  data: z.object({ subscription_id: z.string().min(1).optional() }),
})

export class DodoWebhookGateway implements BillingWebhookGateway {
  constructor(private readonly secret: string) {}

  /**
   * Dodo signs deliveries with Standard Webhooks: an HMAC over the delivery id,
   * its timestamp and the raw body. Stale timestamps are refused, which stops a
   * captured delivery from being replayed.
   */
  verify(rawBody: string, headers: Record<string, string>): BillingEvent {
    let payload: unknown
    try {
      payload = new Webhook(this.secret).verify(rawBody, headers)
    } catch (error) {
      if (error instanceof WebhookVerificationError)
        throw new InvalidWebhookSignatureError()
      throw error
    }

    const event = eventSchema.safeParse(payload)
    if (!event.success) {
      throw new BadRequestError(
        "The webhook body does not match the expected event shape.",
        event.error
      )
    }

    const { type, data } = event.data
    // An Indian mandate can activate before its first debit succeeds. Both
    // subscription and payment events wake a read of the provider's state.
    if (
      (type.startsWith("subscription.") || type.startsWith("payment.")) &&
      data.subscription_id
    ) {
      return {
        kind: "subscription_changed",
        providerSubscriptionId: data.subscription_id,
      }
    }

    return { kind: "unhandled" }
  }
}
