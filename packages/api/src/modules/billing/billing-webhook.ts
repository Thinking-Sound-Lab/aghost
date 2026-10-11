import type { BillingService, WebhookOutcome } from "./billing.service"

/** What a payment provider event asks the product to do. */
export type BillingEvent =
  | { kind: "subscription_changed"; providerSubscriptionId: string }
  | { kind: "unhandled" }

/** Authenticates and decodes the payment provider's webhook deliveries. */
export interface BillingWebhookGateway {
  /** Throws InvalidWebhookSignatureError unless the delivery is signed and fresh. */
  verify(rawBody: string, headers: Record<string, string>): BillingEvent
}

export class BillingWebhookService {
  constructor(
    private readonly gateway: BillingWebhookGateway,
    private readonly billing: BillingService
  ) {}

  receive(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<WebhookOutcome> {
    const event = this.gateway.verify(rawBody, headers)

    if (event.kind === "unhandled") return Promise.resolve("ignored")

    return this.billing.refreshSubscription(event.providerSubscriptionId)
  }
}
