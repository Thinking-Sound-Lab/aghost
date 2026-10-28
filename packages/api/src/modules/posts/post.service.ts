import type {
  CreateAutomationInput,
  PostAutomationInput,
} from "../../contract/automation"
import { accountLabel, PLATFORM_RULES } from "../../contract/platform"
import {
  MEDIA_CONTENT_TYPES,
  POST_LIMITS,
  isReelMedia,
  platformProblems,
  type CreateMediaUploadInput,
  type MediaUpload,
  type ParsedCrossPostInput,
  type ParsedSchedulePostInput,
  type ParsedUpdateScheduledPostInput,
  type ScheduledPostRange,
} from "../../contract/post"
import {
  AccountDisconnectedError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ProviderError,
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

  /**
   * Schedules a post on one Instagram account. Clients written for Instagram
   * alone use this; `crossPost` publishes on any platform.
   */
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
      if (account.platform !== "instagram")
        throw new ValidationError({
          instagramAccountId:
            "Choose an Instagram account. Posts on other platforms are scheduled with cross_post.",
        })
      const content = contentOf({ ...input, youtube: null })
      assertFits(account, content, input.automation !== null, "")
      assertAhead(content.scheduledFor)
      await this.assertCanPublish(account)

      const post = await this.publishOn(
        workspace,
        account,
        content,
        input.automation
      )
      this.record(workspace, { name: "post_scheduled", ...shapeOf(post) })
      return post
    })
  }

  /**
   * Schedules the post on every chosen account, each copy with its own
   * caption where one is given. All of them are scheduled or none is: a post
   * that went out on some accounts only would have to be fixed by hand.
   */
  async crossPost(
    workspace: WorkspaceRecord,
    input: ParsedCrossPostInput
  ): Promise<ScheduledPostRecord[]> {
    return this.operations.run(workspace.id, async () => {
      await this.plan.assertCanUseWorkspace(workspace)
      const shared = contentOf({ ...input, youtube: null })
      const copies = await Promise.all(
        input.targets.map(async (target) => {
          const account = await this.getAccount(workspace.id, target.accountId)
          const instagram = account.platform === "instagram"
          const content: PostContent = {
            ...shared,
            caption:
              target.caption === null ? shared.caption : target.caption || null,
            // Trial Reels and automations are Instagram's; the other copies
            // publish as plain posts.
            trialReel: instagram ? shared.trialReel : null,
            youtube: target.youtube,
          }
          return {
            account,
            content,
            automation: instagram ? input.automation : null,
          }
        })
      )
      const problems = Object.assign(
        {},
        ...copies.map((copy, index) =>
          problemsOf(
            copy.account,
            copy.content,
            copy.automation !== null,
            `targets.${index}.`
          )
        )
      )
      if (Object.keys(problems).length > 0) throw new ValidationError(problems)
      assertAhead(shared.scheduledFor)
      for (const copy of copies) await this.assertCanPublish(copy.account)

      const posts: ScheduledPostRecord[] = []
      try {
        for (const copy of copies)
          posts.push(
            await this.publishOn(
              workspace,
              copy.account,
              copy.content,
              copy.automation
            )
          )
      } catch (error) {
        // Cancel every copy, even when one cancellation fails: a copy left
        // behind would still publish. One that can't be cancelled stays in
        // the calendar, where the owner can delete it.
        const results = await Promise.allSettled(
          posts.map((post) => this.discard(workspace, post))
        )
        const failures = results.flatMap((result) =>
          result.status === "rejected" ? [result.reason] : []
        )
        if (failures.length > 0)
          throw new ProviderError(
            `Couldn't schedule every copy, and ${failures.length === 1 ? "1 copy" : `${failures.length} copies`} already scheduled couldn't be cancelled. Delete ${failures.length === 1 ? "it" : "them"} from the calendar.`,
            new AggregateError([error, ...failures])
          )
        throw error
      }
      for (const post of posts)
        this.record(workspace, { name: "post_scheduled", ...shapeOf(post) })
      return posts
    })
  }

  /**
   * Schedules one copy with the provider and stores it, with the automation
   * that answers its comments. A failure leaves nothing of it behind.
   */
  private async publishOn(
    workspace: WorkspaceRecord,
    account: AccountRecord,
    content: PostContent,
    automation: PostAutomationInput | null
  ): Promise<ScheduledPostRecord> {
    const providerPostId = await this.provider.schedule(account, content)
    let post: ScheduledPostRecord
    try {
      post = await this.posts.insert({
        ...content,
        workspaceId: workspace.id,
        accountId: account.id,
        platform: account.platform,
        providerPostId,
      })
    } catch (error) {
      // The provider would publish a post the owner cannot see or cancel.
      await this.provider.delete(providerPostId)
      throw error
    }

    if (automation) {
      try {
        const created = await this.automations.create(workspace, {
          ...automation,
          instagramAccountId: account.id,
          trigger: { postScope: "scheduled_post", scheduledPostId: post.id },
        })
        post = { ...post, automationIds: [created.id] }
      } catch (error) {
        // Without its automation the post would go out with nobody
        // answering its comments, so it is not scheduled either.
        await this.provider.delete(providerPostId)
        await this.posts.delete(workspace.id, post.id)
        throw error
      }
    }
    return post
  }

  async update(
    workspace: WorkspaceRecord,
    id: string,
    input: ParsedUpdateScheduledPostInput
  ): Promise<ScheduledPostRecord> {
    return this.operations.run(workspace.id, async () => {
      await this.plan.assertCanUseWorkspace(workspace)
      const current = await this.get(workspace, id)
      if (current.status !== "scheduled")
        throw new ConflictError(
          current.status === "failed"
            ? "This post failed to publish. Delete it and schedule it again."
            : "This post is already published and can no longer be changed."
        )
      const content = contentOf({
        ...input,
        trialReel:
          input.trialReel === undefined ? current.trialReel : input.trialReel,
        youtube: input.youtube === undefined ? current.youtube : input.youtube,
      })
      // Validate the effective settings too: an older client may omit
      // trialReel while replacing the video with a photo or carousel.
      if (content.trialReel && !isReelMedia(content.media))
        throw new ValidationError({
          trialReel:
            "A Trial Reel needs exactly one video and cannot be a story",
        })
      const account = await this.getAccount(workspace.id, current.accountId)
      assertFits(account, content, input.automation !== null, "")
      assertAhead(content.scheduledFor)
      // A story has no comments for an automation, and the provider's record
      // of which one a post is cannot be relied on to change.
      if (content.kind !== current.kind)
        throw new ValidationError({
          kind: "A post can't become a story or a story a post. Delete it and schedule a new one.",
        })
      await this.assertCanPublish(account)

      await this.provider.reschedule(current.providerPostId, account, content)
      let updated: ScheduledPostRecord
      try {
        updated = await this.posts.updateContent(workspace.id, id, content)
      } catch (error) {
        // Put the provider back to what the calendar still shows.
        await this.provider.reschedule(current.providerPostId, account, current)
        throw error
      }
      if (input.automation) {
        try {
          const automation = await this.automations.create(workspace, {
            ...input.automation,
            instagramAccountId: account.id,
            trigger: { postScope: "scheduled_post", scheduledPostId: id },
          })
          updated = {
            ...updated,
            automationIds: [...updated.automationIds, automation.id],
          }
        } catch (error) {
          // A caption asking for comments must not publish without its DM.
          await this.provider.reschedule(
            current.providerPostId,
            account,
            current
          )
          await this.posts.updateContent(workspace.id, id, current)
          throw error
        }
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
      if (current.status === "publishing" || current.status === "published") {
        const { name } = PLATFORM_RULES[current.platform]
        throw new ConflictError(
          `This post is already on ${name}. Delete it on ${name} instead.`
        )
      }
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
    await this.discard(workspace, post)
    this.record(workspace, {
      name: "scheduled_post_deleted",
      post_id: post.id,
      reason,
    })
  }

  /** Cancels a post and deletes it with its automations. */
  private async discard(
    workspace: WorkspaceOwner,
    post: ScheduledPostRecord
  ): Promise<void> {
    // Cancel publishing first: once the record is gone nothing could stop it.
    await this.provider.delete(post.providerPostId)
    await this.automations.deleteAllForScheduledPost(workspace, post.id)
    await this.posts.delete(workspace.id, post.id)
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

    const state = await this.provider.getState(
      post.providerPostId,
      post.platform
    )
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
      throw new AccountDisconnectedError(accountLabel(account))
    if (!(await this.provider.canPublish(account.providerAccountId)))
      throw new PublishingNotAllowedError(accountLabel(account))
  }

  private async getAccount(
    workspaceId: string,
    accountId: string
  ): Promise<AccountRecord> {
    const account = await this.accounts.findById(workspaceId, accountId)
    if (!account) throw new NotFoundError("Account")
    return account
  }

  private record(workspace: WorkspaceOwner, event: ProductEvent): void {
    this.analytics.capture(actorOf(workspace), event)
  }
}

function contentOf(
  input: Pick<
    ParsedCrossPostInput,
    "kind" | "caption" | "media" | "scheduledFor"
  > &
    Pick<PostContent, "youtube"> & { trialReel?: PostContent["trialReel"] }
): PostContent {
  return {
    kind: input.kind,
    caption: input.caption || null,
    media: input.media,
    trialReel: input.trialReel ?? null,
    youtube: input.youtube,
    scheduledFor: new Date(input.scheduledFor).toISOString(),
  }
}

/** Where the copy breaks its platform's rules, by field under `prefix`. */
function problemsOf(
  account: AccountRecord,
  content: PostContent,
  hasAutomation: boolean,
  prefix: string
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(
      platformProblems(account.platform, { ...content, hasAutomation })
    ).map(([field, message]) => [`${prefix}${field}`, message])
  )
}

function assertFits(
  account: AccountRecord,
  content: PostContent,
  hasAutomation: boolean,
  prefix: string
): void {
  const problems = problemsOf(account, content, hasAutomation, prefix)
  if (Object.keys(problems).length > 0) throw new ValidationError(problems)
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
    platform: post.platform,
    kind: post.kind,
    media_count: post.media.length,
    video_count: post.media.filter((item) => item.type === "video").length,
    has_caption: post.caption !== null,
    has_automation: post.automationIds.length > 0,
  }
}
