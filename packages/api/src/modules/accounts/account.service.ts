import type { InstagramPost } from "../../contract/account"
import {
  accountLabel,
  PLATFORM_RULES,
  type Platform,
} from "../../contract/platform"
import {
  AccountDisconnectedError,
  ConflictError,
  NotFoundError,
  PlanLimitError,
} from "../../shared/errors"
import { actorOf, type ProductAnalytics } from "../analytics/analytics"
import type { SocialSetRecord } from "../social-sets/social-set"
import type { WorkspaceOwner, WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import {
  accountChange,
  DISCONNECT_REASONS,
  isRejected,
  type AccountRecord,
  type AccountState,
} from "./account"
import type { AccountProvider } from "./account.provider"
import type { AccountRepository } from "./account.repository"

/** Finds a workspace's social sets and gives each its provider profile. */
export interface AccountSocialSets {
  list(workspace: WorkspaceRecord): Promise<SocialSetRecord[]>
  resolve(
    workspace: WorkspaceRecord,
    id: string | undefined
  ): Promise<SocialSetRecord>
  ensureProviderProfile(set: SocialSetRecord): Promise<string>
}

/** Removes the automations that depend on an account. */
export interface AccountAutomations {
  deleteAllForAccount(
    workspace: WorkspaceOwner,
    accountId: string
  ): Promise<void>
}

/** Cancels the scheduled posts of an account that is being removed. */
export interface AccountPosts {
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
    private readonly provider: AccountProvider,
    private readonly sets: AccountSocialSets,
    private readonly automations: AccountAutomations,
    private readonly posts: AccountPosts,
    /** Where the provider sends the browser once the user has authorized. */
    private readonly connectRedirectUrl: string,
    private readonly plan: AccountPlan,
    private readonly operations: WorkspaceOperations,
    private readonly analytics: ProductAnalytics
  ) {}

  list(workspace: WorkspaceRecord): Promise<AccountRecord[]> {
    return this.accounts.listByWorkspace(workspace.id)
  }

  /** Starts connecting an account on the platform to the set, or the first set. */
  async startConnection(
    workspace: WorkspaceRecord,
    platform: Platform,
    socialSetId?: string
  ): Promise<string> {
    return this.operations.run(workspace.id, async () => {
      const set = await this.sets.resolve(workspace, socialSetId)
      try {
        await this.plan.assertCanConnectAccount(workspace)
        await this.assertPlatformFree(workspace, set, platform, null)
      } catch (error) {
        if (error instanceof PlanLimitError)
          this.analytics.capture(actorOf(workspace), {
            name: "instagram_account_limit_reached",
            account_id: null,
            platform,
          })
        throw error
      }
      const providerProfileId = await this.sets.ensureProviderProfile(set)

      const url = await this.provider.getConnectUrl(
        platform,
        providerProfileId,
        this.connectRedirectUrl,
        null
      )
      this.analytics.capture(actorOf(workspace), {
        name: "instagram_connect_started",
        platform,
      })
      return url
    })
  }

  /**
   * Authorizes a stored account again, which grants the permissions it was
   * connected without, or brings back a disconnected one. The provider may
   * have removed a disconnected account, so that one connects afresh.
   */
  async startReconnection(
    workspace: WorkspaceRecord,
    accountId: string
  ): Promise<string> {
    return this.operations.run(workspace.id, async () => {
      const account = await this.get(workspace, accountId)
      const set = await this.sets.resolve(workspace, account.socialSetId)
      // A connected account keeps its place; a disconnected one needs room
      // again, in the plan and in its set, unless it shared its platform
      // there before sets.
      if (account.status !== "connected") {
        await this.plan.assertCanConnectAccount(workspace)
        if (!account.sharedPlatformBeforeSets)
          await this.assertPlatformFree(
            workspace,
            set,
            account.platform,
            account.id
          )
      }
      const providerProfileId = await this.sets.ensureProviderProfile(set)

      const url = await this.provider.getConnectUrl(
        account.platform,
        providerProfileId,
        this.connectRedirectUrl,
        account.status === "connected" ? account.providerAccountId : null
      )
      this.analytics.capture(actorOf(workspace), {
        name: "instagram_reconnect_started",
        account_id: account.id,
        platform: account.platform,
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
    const [sets, stored] = await Promise.all([
      this.sets.list(workspace),
      this.accounts.listByWorkspace(workspace.id),
    ])
    // A set gets its profile with its first connection, so one without a
    // profile has no accounts to report.
    const reported = (
      await Promise.all(
        sets.flatMap((set) =>
          set.providerProfileId
            ? [
                this.provider
                  .listAccounts(set.providerProfileId)
                  .then((accounts) =>
                    accounts.map((account) => ({ set, account }))
                  ),
              ]
            : []
        )
      )
    ).flat()

    for (const { set, account } of reported) {
      const saved = await this.accounts.save(workspace.id, set.id, {
        providerAccountId: account.providerAccountId,
        platform: account.platform,
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
      this.recordChange(workspace, saved, before ?? null, saved)
      // Keep provider reads, the database decision and rejected-account cleanup
      // under the same ownership as billing. An upgrade or downgrade cannot
      // pass an uncommitted connection or reconnect it during old cleanup.
      if (account.connected && isRejected(saved.disconnectReason)) {
        await this.provider.disconnectAccount(account.providerAccountId)
      }
    }

    const reportedIds = new Set(
      reported.map(({ account }) => account.providerAccountId)
    )

    for (const account of stored) {
      const stillReported = reportedIds.has(account.providerAccountId)

      if (!stillReported && account.status === "connected") {
        await this.accounts.markDisconnected(
          workspace.id,
          account.id,
          DISCONNECT_REASONS.removed
        )
        this.recordChange(workspace, account, account, {
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
    // Recent posts are read to pick one for a comment-to-DM automation.
    if (account.platform !== "instagram")
      throw new NotFoundError("Instagram account")

    if (account.status !== "connected") {
      throw new AccountDisconnectedError(accountLabel(account))
    }

    return this.provider.listRecentPosts(account.providerAccountId)
  }

  /**
   * Disconnects the account, deletes the automations that ran on it and
   * cancels the posts it had still to publish.
   */
  async remove(workspace: WorkspaceRecord, accountId: string): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const account = await this.get(workspace, accountId)

      await this.automations.deleteAllForAccount(workspace, account.id)
      await this.posts.deleteAllForAccount(workspace, account.id)
      await this.provider.disconnectAccount(account.providerAccountId)
      await this.accounts.delete(workspace.id, account.id)
      this.analytics.capture(actorOf(workspace), {
        name: "instagram_account_removed",
        account_id: account.id,
        platform: account.platform,
      })
    })
  }

  /** A set holds one connected account on each platform. */
  private async assertPlatformFree(
    workspace: WorkspaceRecord,
    set: SocialSetRecord,
    platform: Platform,
    accountId: string | null
  ): Promise<void> {
    const accounts = await this.accounts.listByWorkspace(workspace.id)
    if (
      accounts.some(
        (account) =>
          account.socialSetId === set.id &&
          account.platform === platform &&
          account.status === "connected" &&
          account.id !== accountId
      )
    )
      throw new ConflictError(
        `${set.name} already has a ${PLATFORM_RULES[platform].name} account. Use another social set, or disconnect that account first.`
      )
  }

  private recordChange(
    workspace: WorkspaceOwner,
    account: Pick<AccountRecord, "id" | "platform">,
    before: AccountState | null,
    after: AccountState
  ): void {
    const event = accountChange(account, before, after)
    if (event) this.analytics.capture(actorOf(workspace), event)
  }

  private async get(
    workspace: WorkspaceRecord,
    accountId: string
  ): Promise<AccountRecord> {
    const account = await this.accounts.findById(workspace.id, accountId)

    if (!account) {
      throw new NotFoundError("Account")
    }

    return account
  }
}
