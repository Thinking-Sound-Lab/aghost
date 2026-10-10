import type { InboundEvent, InboundEventOutcome } from "./inbound-event"
export type WebhookReceipt = InboundEventOutcome | "duplicate"
export interface WebhookProcessor {
  process(event: InboundEvent): Promise<WebhookReceipt>
}
