import type { InstagramPost } from "../../contract/account"
import type {
  AutomationActivityPage,
  AutomationStatsById,
  AutomationStatus,
  AutomationTrigger,
  AutomationTriggerInput,
  CreateAutomationInput,
  UpdateAutomationInput,
} from "../../contract/automation"
import {
  AccountDisconnectedError,
  InternalError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors"
import type { AccountRecord } from "../accounts/account"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { AutomationConfig, AutomationRecord } from "./automation"
import type {
  ActivityPageRequest,
  AutomationProvider,
} from "./automation.provider"
import type { AutomationRepository } from "./automation.repository"

/** Looks up the accounts automations run on. */
export interface AutomationAccounts {
  findById(workspaceId: string, id: string): Promise<AccountRecord | null>
}

/** Lists the posts an automation can be attached to. */
export interface PostCatalog {
  listRecentPosts(providerAccountId: string): Promise<InstagramPost[]>
}

/** Checks that the workspace's plan lets automations run. */
export interface AutomationPlan {
  assertCanRunAutomations(workspace: WorkspaceRecord): Promise<void>
}

export class AutomationService {
  constructor(
    private readonly automations: AutomationRepository,
    private readonly provider: AutomationProvider,
    private readonly accounts: AutomationAccounts,
    private readonly posts: PostCatalog,
    private readonly plan: AutomationPlan
  ) {}

  list(workspace: WorkspaceRecord): Promise<AutomationRecord[]> {
    return this.automations.listByWorkspace(workspace.id)
  }

  async get(workspace: WorkspaceRecord, id: string): Promise<AutomationRecord> {
    const automation = await this.automations.findById(workspace.id, id)

    if (!automation) {
      throw new NotFoundError("Automation")
    }

    return automation
  }

  async create(
    workspace: WorkspaceRecord,
    input: CreateAutomationInput
  ): Promise<AutomationRecord> {
    const account = await this.getAccount(
      workspace.id,
      input.instagramAccountId
    )
    assertConnected(account)
    if (input.status === "active")
      await this.plan.assertCanRunAutomations(workspace)

    const config: AutomationConfig = {
      name: input.name,
      trigger: await this.resolveTrigger(account, input.trigger, null),
      keywords: input.keywords,
      matchMode: input.matchMode,
      openingDm: input.openingDm,
      dmMessage: input.dmMessage,
      dmButtons: input.dmButtons,
      commentReply: input.commentReply,
      requireFollow: input.requireFollow,
    }

    const providerAutomationId = await this.provider.create(
      {
        providerProfileId: requireProviderProfile(workspace),
        providerAccountId: account.providerAccountId,
      },
      config,
      input.status
    )

    try {
      return await this.automations.insert({
        ...config,
        workspaceId: workspace.id,
        accountId: account.id,
        providerAutomationId,
        status: input.status,
      })
    } catch (error) {
      // The provider now runs an automation the product has no record of.
      // Remove it so nothing is sent that the owner cannot see or stop.
      await this.provider.delete(providerAutomationId)
      throw error
    }
  }

  async update(
    workspace: WorkspaceRecord,
    id: string,
    input: UpdateAutomationInput
  ): Promise<AutomationRecord> {
    const current = await this.get(workspace, id)
    const account = await this.getAccount(workspace.id, current.accountId)
    if (input.status === "active") {
      assertConnected(account)
      await this.plan.assertCanRunAutomations(workspace)
    }

    const config: AutomationConfig = {
      name: input.name,
      trigger: await this.resolveTrigger(
        account,
        input.trigger,
        current.trigger
      ),
      keywords: input.keywords,
      matchMode: input.matchMode,
      openingDm: input.openingDm,
      dmMessage: input.dmMessage,
      dmButtons: input.dmButtons,
      commentReply: input.commentReply,
      requireFollow: input.requireFollow,
    }

    await this.provider.update(
      current.providerAutomationId,
      config,
      input.status
    )

    return this.automations.updateConfig(workspace.id, id, config, input.status)
  }

  async setStatus(
    workspace: WorkspaceRecord,
    id: string,
    status: AutomationStatus
  ): Promise<AutomationRecord> {
    const current = await this.get(workspace, id)

    if (status === "active") {
      assertConnected(await this.getAccount(workspace.id, current.accountId))
      await this.plan.assertCanRunAutomations(workspace)
    }

    await this.provider.setStatus(current.providerAutomationId, status)

    return this.automations.updateStatus(workspace.id, id, status)
  }

  async delete(workspace: WorkspaceRecord, id: string): Promise<void> {
    const current = await this.get(workspace, id)

    // Stop the provider first: once the record is gone there is no other way
    // to find and stop the automation.
    await this.provider.delete(current.providerAutomationId)
    await this.automations.delete(workspace.id, id)
  }

  async deleteAllForAccount(
    workspaceId: string,
    accountId: string
  ): Promise<void> {
    const automations = await this.automations.listByAccount(
      workspaceId,
      accountId
    )

    for (const automation of automations) {
      await this.provider.delete(automation.providerAutomationId)
      await this.automations.delete(workspaceId, automation.id)
    }
  }

  /** Pauses every running automation, for a workspace whose plan has ended. */
  async pauseAll(workspaceId: string): Promise<void> {
    const automations = await this.automations.listByWorkspace(workspaceId)

    for (const automation of automations) {
      if (automation.status !== "active") continue
      await this.provider.setStatus(automation.providerAutomationId, "paused")
      await this.automations.updateStatus(workspaceId, automation.id, "paused")
    }
  }

  async listStats(workspace: WorkspaceRecord): Promise<AutomationStatsById> {
    // Without a provider profile the workspace has never connected an account,
    // so it has no automations to report on.
    if (!workspace.providerProfileId) {
      return {}
    }

    const [automations, statsByProviderId] = await Promise.all([
      this.automations.listByWorkspace(workspace.id),
      this.provider.listStats(workspace.providerProfileId),
    ])

    const statsById: AutomationStatsById = {}

    for (const automation of automations) {
      const stats = statsByProviderId.get(automation.providerAutomationId)

      if (stats) {
        statsById[automation.id] = stats
      }
    }

    return statsById
  }

  async listActivity(
    workspace: WorkspaceRecord,
    id: string,
    page: ActivityPageRequest
  ): Promise<AutomationActivityPage> {
    const automation = await this.get(workspace, id)

    return this.provider.listActivity(automation.providerAutomationId, page)
  }

  private async getAccount(
    workspaceId: string,
    accountId: string
  ): Promise<AccountRecord> {
    const account = await this.accounts.findById(workspaceId, accountId)

    if (!account) {
      throw new NotFoundError("Instagram account")
    }

    return account
  }

  /**
   * Turns the requested trigger into one the product can store. A post is
   * looked up on the account itself, which both confirms it belongs there and
   * supplies its caption and link. An unchanged post keeps what is stored.
   */
  private async resolveTrigger(
    account: AccountRecord,
    requested: AutomationTriggerInput,
    current: AutomationTrigger | null
  ): Promise<AutomationTrigger> {
    if (requested.postScope === "any_post") {
      return { postScope: "any_post" }
    }

    const unchanged =
      current?.postScope === "specific_post" &&
      current.post.platformPostId === requested.platformPostId

    if (unchanged) {
      return current
    }

    assertConnected(account)

    const posts = await this.posts.listRecentPosts(account.providerAccountId)
    const post = posts.find(
      (candidate) => candidate.platformPostId === requested.platformPostId
    )

    if (!post) {
      throw new ValidationError({
        "trigger.platformPostId": "Choose one of this account's recent posts.",
      })
    }

    return {
      postScope: "specific_post",
      post: {
        platformPostId: post.platformPostId,
        caption: post.caption,
        permalink: post.permalink,
      },
    }
  }
}

function assertConnected(account: AccountRecord): void {
  if (account.status !== "connected") {
    throw new AccountDisconnectedError(account.username)
  }
}

function requireProviderProfile(workspace: WorkspaceRecord): string {
  if (!workspace.providerProfileId) {
    throw new InternalError(
      `Workspace ${workspace.id} has a connected account but no provider profile.`
    )
  }

  return workspace.providerProfileId
}
