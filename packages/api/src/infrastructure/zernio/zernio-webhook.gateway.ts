import { createHmac, timingSafeEqual } from "node:crypto"

import { z } from "zod"

import type { InboundEvent } from "../../modules/webhooks/inbound-event"
import type { WebhookGateway } from "../../modules/webhooks/webhook.gateway"
import {
  BadRequestError,
  InvalidWebhookSignatureError,
} from "../../shared/errors"

const envelopeSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  // Present, and true, only on samples sent from Zernio's "test" action.
  test: z.boolean().optional(),
})

const accountSchema = z.object({
  accountId: z.string().min(1),
  profileId: z.string().min(1),
  platform: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().optional(),
})

const accountConnectedSchema = z.object({ account: accountSchema })

const accountDisconnectedSchema = z.object({
  account: accountSchema.extend({ reason: z.string() }),
})

export class ZernioWebhookGateway implements WebhookGateway {
  constructor(private readonly secret: string) {}

  /** Zernio signs each delivery with the hex HMAC-SHA256 of the raw body. */
  verify(rawBody: string, signature: string | undefined): void {
    if (!signature || !/^[a-fA-F0-9]{64}$/.test(signature)) {
      throw new InvalidWebhookSignatureError()
    }

    const expected = createHmac("sha256", this.secret).update(rawBody).digest()
    const received = Buffer.from(signature, "hex")

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new InvalidWebhookSignatureError()
    }
  }

  parse(rawBody: string): InboundEvent {
    const payload = parseJson(rawBody)
    const envelope = decode(envelopeSchema, payload)
    const event = { id: envelope.id, type: envelope.event, payload }

    // Sample events carry made-up ids and must never change real data.
    if (envelope.test) {
      return { ...event, kind: "unhandled" }
    }

    switch (envelope.event) {
      case "account.connected": {
        const { account } = decode(accountConnectedSchema, payload)

        return {
          ...event,
          kind: "account_connected",
          account: {
            providerAccountId: account.accountId,
            providerProfileId: account.profileId,
            platform: account.platform,
            username: account.username,
            displayName: account.displayName ?? null,
          },
        }
      }

      case "account.disconnected": {
        const { account } = decode(accountDisconnectedSchema, payload)

        return {
          ...event,
          kind: "account_disconnected",
          account: {
            providerAccountId: account.accountId,
            platform: account.platform,
            reason: account.reason,
          },
        }
      }

      default:
        return { ...event, kind: "unhandled" }
    }
  }
}

function parseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody)
  } catch (error) {
    throw new BadRequestError("The webhook body is not valid JSON.", error)
  }
}

function decode<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload)

  if (!result.success) {
    throw new BadRequestError(
      "The webhook body does not match the expected event shape.",
      result.error
    )
  }

  return result.data
}
