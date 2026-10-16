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

const inboxEventSchema = z.object({
  account: z.object({
    id: z.string().min(1),
    accountId: z.string().optional(),
    profileId: z.string().optional(),
    platform: z.string(),
  }),
  conversation: z.object({
    id: z.string().min(1),
    participantId: z.string().optional(),
    platformConversationId: z.string().min(1),
  }),
  message: z.object({
    id: z.string().min(1),
    direction: z.enum(["incoming", "outgoing"]),
    sentAt: z.iso.datetime({ offset: true }),
    automationId: z.string().nullable().optional(),
    sentVia: z.string().nullable().optional(),
  }),
  metadata: z.object({ metaInteractive: z.unknown().optional() }).optional(),
})

// Main carousel cards only have URL buttons. Postback buttons are the opening
// or follower gate; its delivery must not start the reminder timer.
function hasPostback(value: unknown, depth = 0): boolean {
  if (depth > 12 || !value || typeof value !== "object") return false
  if (Array.isArray(value))
    return value.some((item) => hasPostback(item, depth + 1))
  const object = value as Record<string, unknown>
  return (
    object.type === "postback" ||
    Object.values(object).some((item) => hasPostback(item, depth + 1))
  )
}

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
      case "message.sent":
      case "message.received": {
        const data = decode(inboxEventSchema, payload)
        if (data.account.platform !== "instagram" || !data.account.profileId)
          return { ...event, kind: "unhandled" }
        const outgoing = envelope.event === "message.sent"
        if (
          outgoing &&
          (data.message.direction !== "outgoing" ||
            data.message.sentVia !== "comment_automation" ||
            !data.message.automationId ||
            hasPostback(data.metadata?.metaInteractive))
        )
          return { ...event, kind: "unhandled" }
        if (!outgoing && data.message.direction !== "incoming")
          return { ...event, kind: "unhandled" }
        return {
          ...event,
          kind: outgoing ? "automation_dm_sent" : "dm_received",
          account: {
            providerAccountId: data.account.accountId ?? data.account.id,
            providerProfileId: data.account.profileId,
            platform: data.account.platform,
          },
          message: {
            providerMessageId: data.message.id,
            providerAutomationId: data.message.automationId ?? null,
            conversationId: data.conversation.id,
            recipientId:
              data.conversation.participantId ??
              data.conversation.platformConversationId,
            sentAt: data.message.sentAt,
          },
        }
      }
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
