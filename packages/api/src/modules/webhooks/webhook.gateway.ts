import type { InboundEvent } from "./inbound-event"

/** Authenticates and decodes the provider's webhook deliveries. */
export interface WebhookGateway {
  /** Throws InvalidWebhookSignatureError unless the signature matches the body. */
  verify(rawBody: string, signature: string | undefined): void
  parse(rawBody: string): InboundEvent
}
