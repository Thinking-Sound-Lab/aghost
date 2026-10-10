import type { WebhookGateway } from "./webhook.gateway"
import type { WebhookProcessor, WebhookReceipt } from "./webhook.processor"

export class WebhookService {
  constructor(
    private readonly gateway: WebhookGateway,
    private readonly processor: WebhookProcessor
  ) {}
  receive(
    rawBody: string,
    signature: string | undefined
  ): Promise<WebhookReceipt> {
    this.gateway.verify(rawBody, signature)
    return this.processor.process(this.gateway.parse(rawBody))
  }
}
