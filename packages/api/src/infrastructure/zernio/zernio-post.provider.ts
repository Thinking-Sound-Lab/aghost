import type {
  CreatePostData,
  InstagramPlatformData,
  Post,
  YouTubePlatformData,
} from "@zernio/node"

import { PLATFORM_RULES, type Platform } from "../../contract/platform"
import type {
  CreateMediaUploadInput,
  ScheduledPostStatus,
} from "../../contract/post"
import type {
  PostContent,
  PublishingAccount,
  PublishingState,
} from "../../modules/posts/post"
import type {
  PublishingProvider,
  UploadTarget,
} from "../../modules/posts/post.provider"
import { ProviderError } from "../../shared/errors"
import {
  causeOf,
  hasStatus,
  request,
  requestDeletion,
  type ZernioAccess,
} from "./zernio-client"

type ZernioStatus = NonNullable<Post["status"]>

const STATUSES: Record<ZernioStatus, ScheduledPostStatus> = {
  scheduled: "scheduled",
  publishing: "publishing",
  published: "published",
  // With a single account a partial post is one that did not publish.
  partial: "failed",
  failed: "failed",
  // aghost never makes drafts or unpublishes; either way it is not live.
  draft: "failed",
  cancelled: "failed",
}

// Why a post has a status that comes with no error of its own.
function statusError(status: ZernioStatus, platform: Platform): string | null {
  if (status === "draft")
    return "This post was taken off the schedule before it was published."
  if (status === "cancelled")
    return `This post was removed from ${PLATFORM_RULES[platform].name}.`
  return null
}

// Zernio no longer has the post, so it can never be published.
const GONE: PublishingState = {
  status: "failed",
  platformPostId: null,
  permalink: null,
  error: "This post was removed before it could be published.",
  publishedAt: null,
}

export class ZernioPublishingProvider implements PublishingProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async canPublish(providerAccountId: string): Promise<boolean> {
    const action = "check whether the account can publish"
    const body = await request(action, () =>
      this.zernio().accounts.getAccountHealth({
        throwOnError: true,
        path: { accountId: providerAccountId },
      })
    )
    const canPost = body.permissions?.canPost
    if (canPost === undefined)
      throw new ProviderError(
        `Couldn't ${action}. The response had no permissions.`
      )
    return canPost
  }

  async createUpload(file: CreateMediaUploadInput): Promise<UploadTarget> {
    const action = "prepare the upload"
    const body = await request(action, () =>
      this.zernio().media.getMediaPresignedUrl({
        throwOnError: true,
        body: {
          filename: file.filename,
          contentType: file.contentType,
          size: file.size,
        },
      })
    )
    if (!body.uploadUrl || !body.publicUrl || body.expiresIn === undefined)
      throw new ProviderError(
        `Couldn't ${action}. The response had no upload address.`
      )
    return {
      uploadUrl: body.uploadUrl,
      publicUrl: body.publicUrl,
      expiresAt: new Date(Date.now() + body.expiresIn * 1000).toISOString(),
    }
  }

  async schedule(
    account: PublishingAccount,
    content: PostContent
  ): Promise<string> {
    const action = `schedule the ${PLATFORM_RULES[account.platform].name} post`
    const body = await request(action, () =>
      this.zernio().posts.createPost({
        throwOnError: true,
        body: {
          ...(content.caption && { content: content.caption }),
          mediaItems: content.media,
          platforms: [toTarget(account, content)],
          scheduledFor: content.scheduledFor,
        },
      })
    )
    const id = "post" in body ? body.post?._id : undefined
    if (!id)
      throw new ProviderError(
        `Couldn't ${action}. The response had no post id.`
      )
    return id
  }

  async reschedule(
    providerPostId: string,
    account: PublishingAccount,
    content: PostContent
  ): Promise<void> {
    await request("update the post", () =>
      this.zernio().posts.updatePost({
        throwOnError: true,
        path: { postId: providerPostId },
        body: {
          // An empty caption removes it.
          content: content.caption ?? "",
          mediaItems: content.media,
          platforms: [toTarget(account, content)],
          scheduledFor: content.scheduledFor,
        },
      })
    )
  }

  async getState(
    providerPostId: string,
    platform: Platform
  ): Promise<PublishingState> {
    const action = "load the post"
    const post = await this.find(action, providerPostId)
    if (post === null) return GONE
    const target = post?.platforms?.find((item) => item.platform === platform)
    if (!target || !post?.status)
      throw new ProviderError(
        `Couldn't ${action}. The response had no ${PLATFORM_RULES[platform].name} status.`
      )
    const status = STATUSES[post.status]
    return {
      status,
      platformPostId: target.platformPostId ?? null,
      permalink: target.platformPostUrl ?? null,
      error:
        status === "failed"
          ? (statusError(post.status, platform) ?? target.errorMessage ?? null)
          : null,
      publishedAt: target.publishedAt ?? null,
    }
  }

  /** Null when Zernio no longer has the post. */
  private async find(
    action: string,
    providerPostId: string
  ): Promise<Post | null | undefined> {
    try {
      const body = await request(action, () =>
        this.zernio().posts.getPost({
          throwOnError: true,
          path: { postId: providerPostId },
        })
      )
      return body.post
    } catch (error) {
      if (hasStatus(causeOf(error), 404)) return null
      throw error
    }
  }

  delete(providerPostId: string): Promise<void> {
    return requestDeletion("cancel the post", () =>
      this.zernio().posts.deletePost({
        throwOnError: true,
        path: { postId: providerPostId },
      })
    )
  }
}

type Target = NonNullable<CreatePostData["body"]["platforms"]>[number]

function toTarget(account: PublishingAccount, content: PostContent): Target {
  return {
    platform: account.platform,
    accountId: account.providerAccountId,
    platformSpecificData: platformDataOf(account.platform, content),
  }
}

// Sent in full each time: an update replaces what was stored, so a story
// that becomes a post loses its story setting.
function platformDataOf(
  platform: Platform,
  content: PostContent
): Target["platformSpecificData"] {
  if (platform === "youtube") {
    if (!content.youtube)
      throw new ProviderError(
        "Couldn't schedule the YouTube video. It has no title."
      )
    const data: YouTubePlatformData = {
      title: content.youtube.title,
      madeForKids: content.youtube.madeForKids,
    }
    return data
  }
  if (platform !== "instagram") return {}
  const data: InstagramPlatformData =
    content.kind === "story"
      ? { contentType: "story" }
      : content.trialReel
        ? {
            trialParams: {
              graduationStrategy:
                content.trialReel.graduationStrategy === "automatic"
                  ? "SS_PERFORMANCE"
                  : "MANUAL",
            },
          }
        : {}
  return data
}
