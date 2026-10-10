import { z } from "zod"

export const INBOX_LIMITS = {
  messageMaxLength: 1000,
} as const

/** An Instagram DM thread on one of the workspace's accounts. */
export type Conversation = {
  /** The provider's conversation id. Opaque: pass it back unchanged. */
  id: string
  instagramAccountId: string
  participant: {
    name: string | null
    avatarUrl: string | null
  }
  lastMessage: string | null
  /** Null when the provider did not report it, which is different from zero. */
  unreadCount: number | null
  updatedAt: string | null
  /** Opens the thread in Instagram, when the provider reports it. */
  url: string | null
}

export type MessageAttachment = {
  type: string
  url: string | null
}

export type Message = {
  id: string
  direction: "incoming" | "outgoing"
  text: string | null
  attachments: MessageAttachment[]
  createdAt: string
}

export const sendMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write a message")
    .max(
      INBOX_LIMITS.messageMaxLength,
      `Use ${INBOX_LIMITS.messageMaxLength} characters or fewer`
    ),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
