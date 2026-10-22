import { accountLabel } from "../../contract/platform"
import { isDeepStrictEqual } from "node:util"
import type { InstagramPost } from "../../contract/account"
import type {
  AutomationActivityPage,
  AutomationStatsById,
  AutomationStatus,
  AutomationTrigger,
  AutomationTriggerInput,
  CreateAutomationInput,
  UpdateAutomationInput,
  FollowUpActivity,
} from "../../contract/automation"
import {
  AccountDisconnectedError,
  InternalError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors"
import type { AccountRecord } from "../accounts/account"
import type { ScheduledPostRecord } from "../posts/post"
import {
  actorOf,
  type ProductAnalytics,
  type ProductEvent,
} from "../analytics/analytics"
import type { WorkspaceOwner, WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import type { AutomationConfig, AutomationRecord } from "./automation"
import type {
  ActivityPageRequest,
  AutomationProvider,
  PostBinding,
} from "./automation.provider"
import type { AutomationRepository } from "./automation.repository"
import type { Plan } from "../../contract/billing"
import { supportsAutomation } from "../billing/plan-entitlements"

/** Looks up the accounts automations run on. */
export interface AutomationAccounts {
  findById(workspaceId: string, id: string): Promise<AccountRecord | null>
}

/** Lists the posts an automation can be attached to. */
export interface PostCatalog {
  listRecentPosts(providerAccountId: string): Promise<InstagramPost[]>
}

/** Looks up the posts scheduled in a workspace. */
export interface ScheduledPosts {
  findById(workspaceId: string, id: string): Promise<ScheduledPostRecord | null>
}

/** A trigger ready to store, and the post the provider should watch for it. */
type ResolvedTrigger<Binding extends PostBinding | null> = {
  trigger: AutomationTrigger
  binding: Binding
}

/** Checks that the workspace's plan lets automations run. */
export interface AutomationPlan {
  assertCanRunAutomations(workspace: WorkspaceRecord): Promise<void>
  assertCanUseAutomationFeatures(
    workspace: WorkspaceRecord,
    config: AutomationConfig
  ): Promise<void>
}

export interface FollowUpActivityReader {
  list(workspaceId: string, automationId: string): Promise<FollowUpActivity[]>
}

export class AutomationService {
  constructor(
    private readonly automations: AutomationRepository,
    private readonly provider: AutomationProvider,
    private readonly accounts: AutomationAccounts,
    private readonly posts: PostCatalog,
    private readonly scheduledPosts: ScheduledPosts,
    private readonly plan: AutomationPlan,
    private readonly operations: WorkspaceOperations,
    private readonly analytics: ProductAnalytics,
    private readonly followUps?: FollowUpActivityReader
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
    return this.operations.run(workspace.id, () =>
      this.createOwned(workspace, input)
    )
  }

  private async createOwned(
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

    const { trigger, binding } = await this.resolveTrigger(
      workspace.id,
      account,
      input.trigger,
      null
    )
    const config: AutomationConfig = {
      name: input.name,
      trigger,
      keywords: input.keywords,
      matchMode: input.matchMode,
      openingDm: input.openingDm,
      dmMessage: input.dmMessage,
      dmButtons: input.dmButtons,
      commentReply: input.commentReply,
      requireFollow: input.requireFollow,
      productCarousel: input.productCarousel ?? null,
      followUp: input.followUp ?? null,
    }
    assertMessageFormat(config)
    await this.plan.assertCanUseAutomationFeatures(workspace, config)

    const providerAutomationId = await this.provider.create(
      {
        providerProfileId: requireProviderProfile(workspace),
        providerAccountId: account.providerAccountId,
      },
      config,
      input.status,
      binding
    )

    let created: AutomationRecord
    try {
      created = await this.automations.insert({
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

    this.record(workspace, { name: "automation_created", ...shapeOf(created) })
    this.recordStatus(workspace, null, created, "owner")
    return created
  }

  async update(
    workspace: WorkspaceRecord,
    id: string,
    input: UpdateAutomationInput
  ): Promise<AutomationRecord> {
    return this.operations.run(workspace.id, () =>
      this.updateOwned(workspace, id, input)
    )
  }

  private async updateOwned(
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

    const { trigger, binding } = await this.resolveTrigger(
      workspace.id,
      account,
      input.trigger,
      current.trigger
    )
    const config: AutomationConfig = {
      name: input.name,
      trigger,
      keywords: input.keywords,
      matchMode: input.matchMode,
      openingDm: input.openingDm,
      dmMessage: input.dmMessage,
      dmButtons: input.dmButtons,
      commentReply: input.commentReply,
      requireFollow: input.requireFollow,
      productCarousel:
        input.productCarousel === undefined
          ? current.productCarousel
          : input.productCarousel,
      followUp:
        input.followUp === undefined ? current.followUp : input.followUp,
    }
    assertMessageFormat(config)
    // Paused drafts may retain settings from their previous plan. Only new
    // settings need feature access; activation always checks the full config.
    const changedFeatures = {
      productCarousel: isDeepStrictEqual(
        config.productCarousel,
        current.productCarousel
      )
        ? null
        : config.productCarousel,
      followUp: isDeepStrictEqual(config.followUp, current.followUp)
        ? null
        : config.followUp,
    }
    if (
      input.status === "active" ||
      changedFeatures.productCarousel ||
      changedFeatures.followUp
    )
      await this.plan.assertCanUseAutomationFeatures(
        workspace,
        input.status === "active" ? config : { ...config, ...changedFeatures }
      )

    await this.provider.update(
      current.providerAutomationId,
      config,
      input.status,
      binding
    )

    const updated = await this.automations.updateConfig(
      workspace.id,
      id,
      config,
      input.status
    )
    this.record(workspace, { name: "automation_updated", ...shapeOf(updated) })
    this.recordStatus(workspace, current, updated, "owner")
    return updated
  }

  async setStatus(
    workspace: WorkspaceRecord,
    id: string,
    status: AutomationStatus
  ): Promise<AutomationRecord> {
    return this.operations.run(workspace.id, () =>
      this.setStatusOwned(workspace, id, status)
    )
  }

  private async setStatusOwned(
    workspace: WorkspaceRecord,
    id: string,
    status: AutomationStatus
  ): Promise<AutomationRecord> {
    const current = await this.get(workspace, id)

    if (status === "active") {
      assertConnected(await this.getAccount(workspace.id, current.accountId))
      await this.plan.assertCanRunAutomations(workspace)
      await this.plan.assertCanUseAutomationFeatures(workspace, current)
    }

    await this.provider.setStatus(current.providerAutomationId, status)

    const updated = await this.automations.updateStatus(
      workspace.id,
      id,
      status
    )
    this.recordStatus(workspace, current, updated, "owner")
    return updated
  }

  async delete(workspace: WorkspaceRecord, id: string): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const current = await this.get(workspace, id)

      // Stop the provider first: once the record is gone there is no other way
      // to find and stop the automation.
      await this.provider.delete(current.providerAutomationId)
      await this.automations.delete(workspace.id, id)
      this.record(workspace, {
        name: "automation_deleted",
        automation_id: id,
        reason: "owner",
      })
    })
  }

  async deleteAllForAccount(
    workspace: WorkspaceOwner,
    accountId: string
  ): Promise<void> {
    return this.operations.run(workspace.id, async () =>
      this.removeAll(
        workspace,
        await this.automations.listByAccount(workspace.id, accountId),
        "account_removed"
      )
    )
  }

  /** Deletes the automations that answer a scheduled post being deleted. */
  async deleteAllForScheduledPost(
    workspace: WorkspaceOwner,
    postId: string
  ): Promise<void> {
    return this.operations.run(workspace.id, async () =>
      this.removeAll(
        workspace,
        await this.automations.listByScheduledPost(workspace.id, postId),
        "post_deleted"
      )
    )
  }

  private async removeAll(
    workspace: WorkspaceOwner,
    automations: AutomationRecord[],
    reason: "account_removed" | "post_deleted"
  ): Promise<void> {
    for (const automation of automations) {
      await this.provider.delete(automation.providerAutomationId)
      await this.automations.delete(workspace.id, automation.id)
      this.record(workspace, {
        name: "automation_deleted",
        automation_id: automation.id,
        reason,
      })
    }
  }

  /** Pauses every running automation, for a workspace whose plan has ended. */
  async pauseAll(workspace: WorkspaceOwner): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const automations = await this.automations.listByWorkspace(workspace.id)

      for (const automation of automations) {
        if (automation.status !== "active") continue
        await this.provider.setStatus(automation.providerAutomationId, "paused")
        const paused = await this.automations.updateStatus(
          workspace.id,
          automation.id,
          "paused"
        )
        this.recordStatus(workspace, automation, paused, "plan")
      }
    })
  }

  async pauseUnsupported(workspace: WorkspaceOwner, plan: Plan): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      for (const automation of await this.automations.listByWorkspace(
        workspace.id
      )) {
        if (
          automation.status !== "active" ||
          supportsAutomation(plan, automation)
        )
          continue
        await this.provider.setStatus(automation.providerAutomationId, "paused")
        const paused = await this.automations.updateStatus(
          workspace.id,
          automation.id,
          "paused"
        )
        this.recordStatus(workspace, automation, paused, "plan")
      }
    })
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

    const [activity, followUps] = await Promise.all([
      this.provider.listActivity(automation.providerAutomationId, page),
      this.followUps?.list(workspace.id, id) ?? Promise.resolve([]),
    ])
    return { ...activity, followUps }
  }

  private record(workspace: WorkspaceOwner, event: ProductEvent): void {
    this.analytics.capture(actorOf(workspace), event)
  }

  /** Records an automation starting or stopping, whoever caused it. */
  private recordStatus(
    workspace: WorkspaceOwner,
    before: AutomationRecord | null,
    after: AutomationRecord,
    reason: "owner" | "plan"
  ): void {
    if (before?.status === after.status) return
    if (after.status === "active")
      this.record(workspace, {
        name: "automation_activated",
        automation_id: after.id,
      })
    else if (before)
      this.record(workspace, {
        name: "automation_paused",
        automation_id: after.id,
        reason,
      })
  }

  private async getAccount(
    workspaceId: string,
    accountId: string
  ): Promise<AccountRecord> {
    const account = await this.accounts.findById(workspaceId, accountId)

    // Comment-to-DM runs on Instagram only.
    if (!account || account.platform !== "instagram") {
      throw new NotFoundError("Instagram account")
    }

    return account
  }

  /**
   * Turns the requested trigger into one the product can store. A post is
   * looked up on the account itself, which both confirms it belongs there and
   * supplies its caption and link. An unchanged trigger keeps what is stored,
   * and its binding is null so the provider keeps watching the same post.
   */
  private async resolveTrigger(
    workspaceId: string,
    account: AccountRecord,
    requested: AutomationTriggerInput,
    current: null
  ): Promise<ResolvedTrigger<PostBinding>>
  private async resolveTrigger(
    workspaceId: string,
    account: AccountRecord,
    requested: AutomationTriggerInput,
    current: AutomationTrigger
  ): Promise<ResolvedTrigger<PostBinding | null>>
  private async resolveTrigger(
    workspaceId: string,
    account: AccountRecord,
    requested: AutomationTriggerInput,
    current: AutomationTrigger | null
  ): Promise<ResolvedTrigger<PostBinding | null>> {
    if (requested.postScope === "any_post") {
      return {
        trigger: { postScope: "any_post" },
        binding:
          current?.postScope === "any_post" ? null : { scope: "any_post" },
      }
    }

    if (requested.postScope === "scheduled_post") {
      return this.resolveScheduledPost(
        workspaceId,
        account,
        requested.scheduledPostId,
        current
      )
    }

    const unchanged =
      current?.postScope === "specific_post" &&
      current.post.platformPostId === requested.platformPostId

    if (unchanged) {
      return { trigger: current, binding: null }
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
      trigger: {
        postScope: "specific_post",
        post: {
          platformPostId: post.platformPostId,
          caption: post.caption,
          permalink: post.permalink,
        },
      },
      binding: {
        scope: "platform_post",
        platformPostId: post.platformPostId,
        caption: post.caption,
      },
    }
  }

  /** A post scheduled in aghost that has yet to publish. */
  private async resolveScheduledPost(
    workspaceId: string,
    account: AccountRecord,
    scheduledPostId: string,
    current: AutomationTrigger | null
  ): Promise<ResolvedTrigger<PostBinding | null>> {
    if (
      current?.postScope === "scheduled_post" &&
      current.scheduledPost.id === scheduledPostId
    ) {
      return { trigger: current, binding: null }
    }

    const post = await this.scheduledPosts.findById(
      workspaceId,
      scheduledPostId
    )
    const invalid = (message: string) =>
      new ValidationError({ "trigger.scheduledPostId": message })

    if (!post || post.accountId !== account.id) {
      throw invalid("Choose one of this account's scheduled posts.")
    }
    if (post.kind === "story") {
      throw invalid("Stories have no comments to answer.")
    }
    if (post.status !== "scheduled") {
      throw invalid(
        "This post is no longer waiting to publish. Choose it from the account's posts instead."
      )
    }

    return {
      trigger: {
        postScope: "scheduled_post",
        scheduledPost: { id: post.id, caption: post.caption },
      },
      binding: {
        scope: "scheduled_post",
        providerPostId: post.providerPostId,
        caption: post.caption,
      },
    }
  }
}

function assertConnected(account: AccountRecord): void {
  if (account.status !== "connected") {
    throw new AccountDisconnectedError(accountLabel(account))
  }
}

function assertMessageFormat(config: AutomationConfig): void {
  if (config.productCarousel && config.dmButtons.length > 0)
    throw new ValidationError({
      dmButtons:
        "Choose link buttons or a product carousel for this DM. Reload the editor if the automation changed in another tab.",
    })
}

function requireProviderProfile(workspace: WorkspaceRecord): string {
  if (!workspace.providerProfileId) {
    throw new InternalError(
      `Workspace ${workspace.id} has a connected account but no provider profile.`
    )
  }

  return workspace.providerProfileId
}

/** What an automation does, without its messages. */
function shapeOf(automation: AutomationRecord) {
  return {
    automation_id: automation.id,
    status: automation.status,
    post_scope: automation.trigger.postScope,
    match_mode: automation.matchMode,
    keyword_count: automation.keywords.length,
    has_opening_dm: automation.openingDm !== null,
    button_count: automation.dmButtons.length,
    has_comment_reply: automation.commentReply !== null,
    requires_follow: automation.requireFollow,
  }
}
