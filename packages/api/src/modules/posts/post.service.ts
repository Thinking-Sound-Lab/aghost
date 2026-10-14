import type { CreateAutomationInput } from "../../contract/automation"
import {
  MEDIA_CONTENT_TYPES,
  POST_LIMITS,
  type CreateMediaUploadInput,
  type MediaUpload,
  type ParsedSchedulePostInput,
  type ParsedUpdateScheduledPostInput,
  type ScheduledPostRange,
} from "../../contract/post"
import {
  AccountDisconnectedError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PublishingNotAllowedError,
  ValidationError,
} from "../../shared/errors"
import type { AccountRecord } from "../accounts/account"
import {
  actorOf,
  type ProductAnalytics,
  type ProductEvent,
} from "../analytics/analytics"
import type { AutomationRecord } from "../automations/automation"
import type { WorkspaceOwner, WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import {
  isSettled,
  type PostContent,
  type PublishingState,
  type ScheduledPostRecord,
} from "./post"
import type { PublishingProvider } from "./post.provider"
import type { ScheduledPostRepository } from "./post.repository"

/** Looks up the accounts posts are published on. */
export interface PostAccounts {
  findById(workspaceId: string, id: string): Promise<AccountRecord | null>
}

/** Creates and removes the automations that answer a post's comments. */
export interface PostAutomations {
  create(
    workspace: WorkspaceRecord,
    input: CreateAutomationInput
  ): Promise<AutomationRecord>
  deleteAllForScheduledPost(
    workspace: WorkspaceOwner,
    postId: string
  ): Promise<void>
}

/** Rechecks the plan while scheduling owns the workspace. */
export interface PostPlan {
  assertCanUseWorkspace(workspace: WorkspaceRecord): Promise<void>
}

// Due posts read from the provider at once, which keeps a long period
// within its rate limits.
const REFRESH_BATCH = 4

const PLAN_ENDED = "Not published: the plan ended before this post's time."

export class PostService {
  constructor(
    private readonly posts: ScheduledPostRepository,
    private readonly provider: PublishingProvider,
    private readonly accounts: PostAccounts,
    private readonly automations: PostAutomations,
    private readonly plan: PostPlan,
    private readonly operations: WorkspaceOperations,
    private readonly analytics: ProductAnalytics
  ) {}

  async list(
    workspace: WorkspaceRecord,
    range: ScheduledPostRange
  ): Promise<ScheduledPostRecord[]> {
    const posts = await this.posts.listByRange(workspace.id, range)
    const refreshed: ScheduledPostRecord[] = []
    for (let start = 0; start < posts.length; start += REFRESH_BATCH)
      refreshed.push(
        ...(await Promise.all(
          posts
            .slice(start, start + REFRESH_BATCH)
            .map((post) => this.refresh(workspace, post))
        ))
      )
    return refreshed
  }

  async get(
    workspace: WorkspaceRecord,
    id: string
  ): Promise<ScheduledPostRecord> {
    const post = await this.posts.findById(workspace.id, id)
    if (!post) throw new NotFoundError("Scheduled post")
    return this.refresh(workspace, post)
  }

  /** Whether the account lets aghost publish, for the owner to reconnect it first. */
  async canPublish(
    workspace: WorkspaceRecord,
    accountId: string
  ): Promise<boolean> {
    const account = await this.getAccount(workspace.id, accountId)
    if (account.status !== "connected") return false
    return this.provider.canPublish(account.providerAccountId)
  }

  async createUpload(input: CreateMediaUploadInput): Promise<MediaUpload> {
    const target = await this.provider.createUpload(input)
    return {
      uploadUrl: target.uploadUrl,
      media: {
        url: target.publicUrl,
        type: MEDIA_CONTENT_TYPES[input.contentType],
      },
      expiresAt: target.expiresAt,
    }
  }

  async schedule(
    workspace: WorkspaceRecord,
    input: ParsedSchedulePostInput
  ): Promise<ScheduledPostRecord> {
    return this.operations.run(workspace.id, async () => {
      // Billing may have ended the plan after the request was authenticated
      // but before this operation acquired the workspace.
      await this.plan.assertCanUseWorkspace(workspace)
      const account = await this.getAccount(
        workspace.id,
        input.instagramAccountId
      )
      const content = contentOf(input)
      assertAhead(content.scheduledFor)
      await this.assertCanPublish(account)

      const providerPostId = await this.provider.schedule(
        account.providerAccountId,
        content
      )
      let post: ScheduledPostRecord
      try {
        post = await this.posts.insert({
          ...content,
          workspaceId: workspace.id,
          accountId: account.id,
          providerPostId,
        })
      } catch (error) {
        // The provider would publish a post the owner cannot see or cancel.
        await this.provider.delete(providerPostId)
        throw error
      }

      if (input.automation) {
        try {
          const automation = await this.automations.create(workspace, {
            ...input.automation,
            instagramAccountId: account.id,
            trigger: { postScope: "scheduled_post", scheduledPostId: post.id },
          })
          post = { ...post, automationIds: [automation.id] }
        } catch (error) {
          // Without its automation the post would go out with nobody
          // answering its comments, so it is not scheduled either.
          await this.provider.delete(providerPostId)
          await this.posts.delete(workspace.id, post.id)
          throw error
        }
      }

      this.record(workspace, { name: "post_scheduled", ...shapeOf(post) })
      return post
    })
  }

  async update(
    workspace: WorkspaceRecord,
    id: string,
    input: ParsedUpdateScheduledPostInput
  ): Promise<ScheduledPostRecord> {
    return this.operations.run(workspace.id, async () => {
      const current = await this.get(workspace, id)
      if (current.status !== "scheduled")
        throw new ConflictError(
          current.status === "failed"
            ? "This post failed to publish. Delete it and schedule it again."
            : "This post is already published and can no longer be changed."
        )
      const content = contentOf(input)
      assertAhead(content.scheduledFor)
      // A story has no comments for an automation, and the provider's record
      // of which one a post is cannot be relied on to change.
      if (content.kind !== current.kind)
        throw new ValidationError({
          kind: "A post can't become a story or a story a post. Delete it and schedule a new one.",
        })
      const account = await this.getAccount(workspace.id, current.accountId)
      await this.assertCanPublish(account)

      await this.provider.reschedule(
        current.providerPostId,
        account.providerAccountId,
        content
      )
      let updated: ScheduledPostRecord
      try {
        updated = await this.posts.updateContent(workspace.id, id, content)
      } catch (error) {
        // Put the provider back to what the calendar still shows.
        await this.provider.reschedule(
          current.providerPostId,
          account.providerAccountId,
          current
        )
        throw error
      }
      this.record(workspace, {
        name: "scheduled_post_updated",
        ...shapeOf(updated),
      })
      return updated
    })
  }

  async delete(
    workspace: WorkspaceRecord,
    id: string,
    canDeleteAutomations = true
  ): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const current = await this.get(workspace, id)
      // An automation may have been attached while this request waited.
      if (current.automationIds.length > 0 && !canDeleteAutomations)
        throw new ForbiddenError("automations:write")
      if (current.status === "publishing" || current.status === "published")
        throw new ConflictError(
          "This post is already on Instagram. Delete it in the Instagram app."
        )
      await this.remove(workspace, current, "owner")
    })
  }

  /** Cancels the posts still to be published on an account that is being removed. */
  async deleteAllForAccount(
    workspace: WorkspaceOwner,
    accountId: string
  ): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const posts = await this.posts.listByAccount(workspace.id, accountId)
      for (const post of posts) {
        // A post may have gone out since it was last read.
        const current = await this.refresh(workspace, post)
        if (current.status === "publishing" || current.status === "published") {
          await this.posts.delete(workspace.id, post.id)
          continue
        }
        await this.remove(workspace, current, "account_removed")
      }
    })
  }

  /**
   * Cancels every post still waiting to publish, for a workspace whose plan
   * has ended. They stay in the calendar as failed, with the reason.
   */
  async cancelAll(workspace: WorkspaceOwner): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const posts = await this.posts.listScheduled(workspace.id)
      for (const post of posts) {
        if ((await this.refresh(workspace, post)).status !== "scheduled")
          continue
        await this.provider.delete(post.providerPostId)
        const stored = await this.posts.updateState(
          workspace.id,
          post.id,
          "scheduled",
          {
            status: "failed",
            platformPostId: null,
            permalink: null,
            error: PLAN_ENDED,
            publishedAt: null,
          }
        )
        if (stored)
          this.record(workspace, {
            name: "scheduled_post_failed",
            post_id: post.id,
            reason: "plan",
          })
      }
    })
  }

  private async remove(
    workspace: WorkspaceOwner,
    post: ScheduledPostRecord,
    reason: "owner" | "account_removed"
  ): Promise<void> {
    // Cancel publishing first: once the record is gone nothing could stop it.
    await this.provider.delete(post.providerPostId)
    await this.automations.deleteAllForScheduledPost(workspace, post.id)
    await this.posts.delete(workspace.id, post.id)
    this.record(workspace, {
      name: "scheduled_post_deleted",
      post_id: post.id,
      reason,
    })
  }

  /**
   * Asks the provider about a post whose time has come and keeps what it
   * reports, so reads show posts as published or failed.
   */
  private async refresh(
    workspace: WorkspaceOwner,
    post: ScheduledPostRecord
  ): Promise<ScheduledPostRecord> {
    if (isSettled(post.status) || Date.parse(post.scheduledFor) > Date.now())
      return post

    const state = await this.provider.getState(post.providerPostId)
    if (sameState(post, state)) return post

    const stored = await this.posts.updateState(
      workspace.id,
      post.id,
      post.status,
      state
    )
    if (stored && state.status === "published")
      this.record(workspace, {
        name: "scheduled_post_published",
        post_id: post.id,
      })
    if (stored && state.status === "failed")
      this.record(workspace, {
        name: "scheduled_post_failed",
        post_id: post.id,
        reason: "publishing",
      })
    return { ...post, ...state }
  }

  private async assertCanPublish(account: AccountRecord): Promise<void> {
    if (account.status !== "connected")
      throw new AccountDisconnectedError(account.username)
    if (!(await this.provider.canPublish(account.providerAccountId)))
      throw new PublishingNotAllowedError(account.username)
  }

  private async getAccount(
    workspaceId: string,
    accountId: string
  ): Promise<AccountRecord> {
    const account = await this.accounts.findById(workspaceId, accountId)
    if (!account) throw new NotFoundError("Instagram account")
    return account
  }

  private record(workspace: WorkspaceOwner, event: ProductEvent): void {
    this.analytics.capture(actorOf(workspace), event)
  }
}

function contentOf(
  input: ParsedSchedulePostInput | ParsedUpdateScheduledPostInput
): PostContent {
  return {
    kind: input.kind,
    caption: input.caption || null,
    media: input.media,
    scheduledFor: new Date(input.scheduledFor).toISOString(),
  }
}

function assertAhead(scheduledFor: string): void {
  const earliest = Date.now() + POST_LIMITS.minLeadMinutes * 60_000
  if (Date.parse(scheduledFor) < earliest)
    throw new ValidationError({
      scheduledFor: `Choose a time at least ${POST_LIMITS.minLeadMinutes} minutes from now.`,
    })
}

function sameState(post: ScheduledPostRecord, state: PublishingState): boolean {
  return (
    post.status === state.status &&
    post.platformPostId === state.platformPostId &&
    post.permalink === state.permalink &&
    post.error === state.error &&
    post.publishedAt === state.publishedAt
  )
}

/** What a post is, without its caption or media. */
function shapeOf(post: ScheduledPostRecord) {
  return {
    post_id: post.id,
    kind: post.kind,
    media_count: post.media.length,
    video_count: post.media.filter((item) => item.type === "video").length,
    has_caption: post.caption !== null,
    has_automation: post.automationIds.length > 0,
  }
}
