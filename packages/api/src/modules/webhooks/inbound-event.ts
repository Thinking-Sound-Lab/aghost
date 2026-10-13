/** An event the provider delivered, reduced to what the product acts on. */
export type InboundEvent = {
  /** Stable across redeliveries: the key used to handle an event only once. */
  id: string
  /** The provider's own event name, kept for the ledger. */
  type: string
  /** The delivered body, exactly as received. */
  payload: unknown
} & (
  | {
      kind: "account_connected"
      account: {
        providerAccountId: string
        providerProfileId: string
        platform: string
        username: string
        displayName: string | null
      }
    }
  | {
      kind: "account_disconnected"
      account: {
        providerAccountId: string
        platform: string
        reason: string
      }
    }
  | { kind: "unhandled" }
  | {
      kind: "automation_dm_sent" | "dm_received"
      account: {
        providerAccountId: string
        providerProfileId: string
        platform: string
      }
      message: {
        providerMessageId: string
        providerAutomationId: string | null
        conversationId: string
        recipientId: string
        sentAt: string
      }
    }
)

/** `ignored` means the event was understood but does not concern this product. */
export type InboundEventOutcome = "processed" | "ignored"
