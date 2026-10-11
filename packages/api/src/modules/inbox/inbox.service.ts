import type { Conversation, Message } from "../../contract/inbox"
import { AccountDisconnectedError, NotFoundError } from "../../shared/errors"
import type { AccountRecord } from "../accounts/account"
import { actorOf, type ProductAnalytics } from "../analytics/analytics"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { InboxProvider } from "./inbox.provider"

/** Looks up the accounts conversations belong to. */
export interface InboxAccounts {
  listByWorkspace(workspaceId: string): Promise<AccountRecord[]>
  findById(workspaceId: string, id: string): Promise<AccountRecord | null>
}

export class InboxService {
  constructor(
    private readonly provider: InboxProvider,
    private readonly accounts: InboxAccounts,
    private readonly analytics: ProductAnalytics
  ) {}

  async listConversations(workspace: WorkspaceRecord): Promise<Conversation[]> {
    // Without a provider profile the workspace has never connected an account,
    // so it has no conversations.
    if (!workspace.providerProfileId) {
      return []
    }

    const [conversations, accounts] = await Promise.all([
      this.provider.listConversations(workspace.providerProfileId),
      this.accounts.listByWorkspace(workspace.id),
    ])

    const accountIdByProviderId = new Map(
      accounts.map((account) => [account.providerAccountId, account.id])
    )

    // Only the workspace's own accounts are shown, even if the profile holds
    // another one, such as an account still being connected.
    return conversations.flatMap(({ providerAccountId, ...conversation }) => {
      const instagramAccountId = accountIdByProviderId.get(providerAccountId)

      return instagramAccountId ? [{ ...conversation, instagramAccountId }] : []
    })
  }

  async listMessages(
    workspace: WorkspaceRecord,
    accountId: string,
    conversationId: string
  ): Promise<Message[]> {
    const account = await this.getConversationAccount(
      workspace,
      accountId,
      conversationId
    )

    return this.provider.listMessages(account.providerAccountId, conversationId)
  }

  async sendMessage(
    workspace: WorkspaceRecord,
    accountId: string,
    conversationId: string,
    text: string
  ): Promise<void> {
    const account = await this.getConversationAccount(
      workspace,
      accountId,
      conversationId
    )

    if (account.status !== "connected") {
      throw new AccountDisconnectedError(account.username)
    }

    await this.provider.sendMessage(
      account.providerAccountId,
      conversationId,
      text
    )
    this.analytics.capture(actorOf(workspace), {
      name: "inbox_message_sent",
      account_id: account.id,
    })
  }

  /**
   * Every workspace reaches the provider with the same credentials, so the
   * provider would act on any account and conversation it is given. Confirm
   * the account is the workspace's and the conversation is the account's first.
   */
  private async getConversationAccount(
    workspace: WorkspaceRecord,
    accountId: string,
    conversationId: string
  ): Promise<AccountRecord> {
    const account = await this.accounts.findById(workspace.id, accountId)

    if (!account) {
      throw new NotFoundError("Instagram account")
    }

    const owned = await this.provider.hasConversation(
      account.providerAccountId,
      conversationId
    )

    if (!owned) {
      throw new NotFoundError("Conversation")
    }

    return account
  }
}
