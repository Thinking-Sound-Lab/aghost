import type { InstagramPost } from "../../contract/account"
import {
  AccountDisconnectedError,
  NotFoundError,
  PlanLimitError,
} from "../../shared/errors"
import { actorOf, type ProductAnalytics } from "../analytics/analytics"
import type { WorkspaceOwner, WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import {
  accountChange,
  DISCONNECT_REASONS,
  type AccountRecord,
  type AccountState,
} from "./account"
import type { AccountRepository } from "./account.repository"
import type { InstagramProvider } from "./instagram.provider"

/** Gives a workspace its provider profile, creating it on first use. */
export interface ProviderProfiles {
  ensureProviderProfile(workspace: WorkspaceRecord): Promise<string>
}

/** Removes the automations that depend on an account. */
export interface AccountAutomations {
  deleteAllForAccount(
    workspace: WorkspaceOwner,
    accountId: string
  ): Promise<void>
}

/** Checks that the workspace's plan has room for another account. */
export interface AccountPlan {
  assertCanConnectAccount(workspace: WorkspaceRecord): Promise<void>
}

export class AccountService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly instagram: InstagramProvider,
    private readonly profiles: ProviderProfiles,
    private readonly automations: AccountAutomations,
    /** Where the provider sends the browser once the user has authorized. */
    private readonly connectRedirectUrl: string,
    private readonly plan: AccountPlan,
    private readonly operations: WorkspaceOperations,
    private readonly analytics: ProductAnalytics
  ) {}

  list(workspace: WorkspaceRecord): Promise<AccountRecord[]> {
    return this.accounts.listByWorkspace(workspace.id)
  }

  async startConnection(workspace: WorkspaceRecord): Promise<string> {
    return this.operations.run(workspace.id, async () => {
      try {
        await this.plan.assertCanConnectAccount(workspace)
      } catch (error) {
        if (error instanceof PlanLimitError)
          this.analytics.capture(actorOf(workspace), {
            name: "instagram_account_limit_reached",
            account_id: null,
          })
        throw error
      }
      const providerProfileId =
        await this.profiles.ensureProviderProfile(workspace)

      const url = await this.instagram.getConnectUrl(
        providerProfileId,
        this.connectRedirectUrl
      )
      this.analytics.capture(actorOf(workspace), {
        name: "instagram_connect_started",
      })
      return url
    })
  }

  /**
   * Brings the stored accounts in line with what the provider reports. The
   * provider is the only source consulted, so nothing the browser sends after
   * the connection flow is trusted.
   */
  async sync(workspace: WorkspaceRecord): Promise<AccountRecord[]> {
    return this.operations.run(workspace.id, () => this.syncOwned(workspace))
  }

  private async syncOwned(
    workspace: WorkspaceRecord
  ): Promise<AccountRecord[]> {
    if (!workspace.providerProfileId) {
      return this.accounts.listByWorkspace(workspace.id)
    }

    const [reported, stored] = await Promise.all([
      this.instagram.listAccounts(workspace.providerProfileId),
      this.accounts.listByWorkspace(workspace.id),
    ])

    for (const account of reported) {
      const saved = await this.accounts.save(workspace.id, {
        providerAccountId: account.providerAccountId,
        username: account.username,
        displayName: account.displayName,
        profilePictureUrl: account.profilePictureUrl,
        status: account.connected ? "connected" : "disconnected",
        disconnectReason: account.connected
          ? null
          : DISCONNECT_REASONS.accessExpired,
      })
      const before = stored.find(
        (candidate) => candidate.providerAccountId === account.providerAccountId
      )
      this.recordChange(workspace, saved.id, before ?? null, saved)
      // Keep provider reads, the database decision and rejected-account cleanup
      // under the same ownership as billing. An upgrade or downgrade cannot
      // pass an uncommitted connection or reconnect it during old cleanup.
      if (
        account.connected &&
        saved.disconnectReason === DISCONNECT_REASONS.planLimit
      ) {
        await this.instagram.disconnectAccount(account.providerAccountId)
      }
    }

    const reportedIds = new Set(
      reported.map((account) => account.providerAccountId)
    )

    for (const account of stored) {
      const stillReported = reportedIds.has(account.providerAccountId)

      if (!stillReported && account.status === "connected") {
        await this.accounts.markDisconnected(
          workspace.id,
          account.id,
          DISCONNECT_REASONS.removed
        )
        this.recordChange(workspace, account.id, account, {
          status: "disconnected",
          disconnectReason: DISCONNECT_REASONS.removed,
        })
      }
    }

    return this.accounts.listByWorkspace(workspace.id)
  }

  async listRecentPosts(
    workspace: WorkspaceRecord,
    accountId: string
  ): Promise<InstagramPost[]> {
    const account = await this.get(workspace, accountId)

    if (account.status !== "connected") {
      throw new AccountDisconnectedError(account.username)
    }

    return this.instagram.listRecentPosts(account.providerAccountId)
  }

  /** Disconnects the account and deletes the automations that ran on it. */
  async remove(workspace: WorkspaceRecord, accountId: string): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const account = await this.get(workspace, accountId)

      await this.automations.deleteAllForAccount(workspace, account.id)
      await this.instagram.disconnectAccount(account.providerAccountId)
      await this.accounts.delete(workspace.id, account.id)
      this.analytics.capture(actorOf(workspace), {
        name: "instagram_account_removed",
        account_id: account.id,
      })
    })
  }

  private recordChange(
    workspace: WorkspaceOwner,
    accountId: string,
    before: AccountState | null,
    after: AccountState
  ): void {
    const event = accountChange(accountId, before, after)
    if (event) this.analytics.capture(actorOf(workspace), event)
  }

  private async get(
    workspace: WorkspaceRecord,
    accountId: string
  ): Promise<AccountRecord> {
    const account = await this.accounts.findById(workspace.id, accountId)

    if (!account) {
      throw new NotFoundError("Instagram account")
    }

    return account
  }
}
