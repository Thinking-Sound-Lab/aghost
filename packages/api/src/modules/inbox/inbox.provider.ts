import type { Conversation, Message } from "../../contract/inbox"

/** A conversation as the provider reports it, on one of its accounts. */
export type ProviderConversation = Omit<Conversation, "instagramAccountId"> & {
  providerAccountId: string
}

/** The service that holds the Instagram DM threads and sends replies. */
export interface InboxProvider {
  /** The profile's Instagram conversations, newest first. */
  listConversations(providerProfileId: string): Promise<ProviderConversation[]>
  /** False when the conversation is not one of the account's. */
  hasConversation(
    providerAccountId: string,
    conversationId: string
  ): Promise<boolean>
  /** The conversation's latest messages, oldest first. */
  listMessages(
    providerAccountId: string,
    conversationId: string
  ): Promise<Message[]>
  sendMessage(
    providerAccountId: string,
    conversationId: string,
    text: string
  ): Promise<void>
}
