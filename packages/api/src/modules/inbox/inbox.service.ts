import { accountLabel } from "../../contract/platform"
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
    const accounts = await this.accounts.listByWorkspace(workspace.id)
    // Each social set's profile holds its own conversations.
    const profiles = new Set(
      accounts.flatMap((account) =>
        account.platform === "instagram" && account.providerProfileId
          ? [account.providerProfileId]
          : []
      )
    )
    const conversations = (
      await Promise.all(
        [...profiles].map((profile) => this.provider.listConversations(profile))
      )
    )
      .flat()
      // Newest first across sets; a thread without a time goes last.
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))

    const accountIdByProviderId = new Map(
      accounts
        .filter((account) => account.platform === "instagram")
        .map((account) => [account.providerAccountId, account.id])
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
      throw new AccountDisconnectedError(accountLabel(account))
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

    // The inbox holds Instagram DMs only.
    if (!account || account.platform !== "instagram") {
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
