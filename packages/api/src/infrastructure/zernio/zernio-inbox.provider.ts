import type {
  GetInboxConversationMessagesResponse,
  ListInboxConversationsResponse,
} from "@zernio/node"

import type { Message, MessageAttachment } from "../../contract/inbox"
import type {
  InboxProvider,
  ProviderConversation,
} from "../../modules/inbox/inbox.provider"
import { ProviderError } from "../../shared/errors"
import { request, type ZernioAccess } from "./zernio-client"

type ZernioConversation = NonNullable<
  ListInboxConversationsResponse["data"]
>[number]
type ZernioMessage = NonNullable<
  GetInboxConversationMessagesResponse["messages"]
>[number]
type ZernioAttachment = NonNullable<ZernioMessage["attachments"]>[number]

const CONVERSATION_LIMIT = 50
// The most Zernio returns in one page.
const MESSAGE_LIMIT = 100

export class ZernioInboxProvider implements InboxProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async listConversations(
    providerProfileId: string
  ): Promise<ProviderConversation[]> {
    const action = "load the inbox"

    const body = await request(action, () =>
      this.zernio().messages.listInboxConversations({
        throwOnError: true,
        query: {
          profileId: providerProfileId,
          platform: "instagram",
          sortOrder: "desc",
          limit: CONVERSATION_LIMIT,
        },
      })
    )

    if (!body.data) {
      throw new ProviderError(
        `Couldn't ${action}. The response had no conversations.`
      )
    }

    // Zernio still answers when it could not read some accounts. Their
    // conversations would be missing from a list that looks complete.
    if (body.meta?.accountsFailed) {
      throw new ProviderError(
        `Couldn't ${action}. Some accounts' conversations could not be read.`
      )
    }

    return body.data.map(toConversation)
  }

  async hasConversation(
    providerAccountId: string,
    conversationId: string
  ): Promise<boolean> {
    const action = "open the conversation"

    const body = await request(action, () =>
      this.zernio().messages.getInboxConversation({
        throwOnError: true,
        path: { conversationId },
        query: { accountId: providerAccountId },
      })
    )

    if (!body.data) {
      throw new ProviderError(
        `Couldn't ${action}. The response had no conversation.`
      )
    }

    // Zernio answers for any conversation id, echoing back the account it was
    // asked about. Only a conversation the account really holds names the
    // person on the other side.
    return (
      body.data.accountId === providerAccountId &&
      Boolean(body.data.participantId)
    )
  }

  async listMessages(
    providerAccountId: string,
    conversationId: string
  ): Promise<Message[]> {
    const action = "load the conversation"

    // Newest first so a long thread shows its latest messages, then reversed
    // to read top to bottom.
    const body = await request(action, () =>
      this.zernio().messages.getInboxConversationMessages({
        throwOnError: true,
        path: { conversationId },
        query: {
          accountId: providerAccountId,
          sortOrder: "desc",
          limit: MESSAGE_LIMIT,
        },
      })
    )

    if (!body.messages) {
      throw new ProviderError(
        `Couldn't ${action}. The response had no messages.`
      )
    }

    return body.messages.map(toMessage).reverse()
  }

  async sendMessage(
    providerAccountId: string,
    conversationId: string,
    text: string
  ): Promise<void> {
    await request("send the message", () =>
      this.zernio().messages.sendInboxMessage({
        throwOnError: true,
        path: { conversationId },
        body: { accountId: providerAccountId, message: text },
      })
    )
  }
}

function toConversation(
  conversation: ZernioConversation
): ProviderConversation {
  if (!conversation.id || !conversation.accountId) {
    throw new ProviderError(
      "Couldn't load the inbox. A conversation in the response was incomplete."
    )
  }

  return {
    id: conversation.id,
    providerAccountId: conversation.accountId,
    participant: {
      name: conversation.participantName ?? null,
      avatarUrl: conversation.participantPicture ?? null,
    },
    lastMessage: conversation.lastMessage ?? null,
    unreadCount: conversation.unreadCount ?? null,
    updatedAt: conversation.updatedTime ?? null,
    url: conversation.url ?? null,
  }
}

function toMessage(message: ZernioMessage): Message {
  if (
    !message.id ||
    !message.direction ||
    !message.createdAt ||
    !message.attachments
  ) {
    throw new ProviderError(
      "Couldn't load the conversation. A message in the response was incomplete."
    )
  }

  return {
    id: message.id,
    direction: message.direction,
    // A message with only an attachment, or whose content Instagram withholds,
    // has empty text.
    text: message.message ? message.message : null,
    attachments: message.attachments.map(toAttachment),
    createdAt: message.createdAt,
  }
}

function toAttachment(attachment: ZernioAttachment): MessageAttachment {
  if (!attachment.type) {
    throw new ProviderError(
      "Couldn't load the conversation. An attachment in the response had no type."
    )
  }

  return { type: attachment.type, url: attachment.url ?? null }
}
