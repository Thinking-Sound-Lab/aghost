import type { InstagramPlatformData, Post } from "@zernio/node"

import type {
  CreateMediaUploadInput,
  ScheduledPostStatus,
} from "../../contract/post"
import type { PostContent, PublishingState } from "../../modules/posts/post"
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
const STATUS_ERRORS: Partial<Record<ZernioStatus, string>> = {
  draft: "This post was taken off the schedule before it was published.",
  cancelled: "This post was removed from Instagram.",
}

// Zernio presigns uploads to its Cloudflare R2 bucket, which accepts them
// from any origin.
export const ZERNIO_UPLOAD_ORIGIN =
  "https://late-media.613d73a46130ed0083c059a837d6511b.r2.cloudflarestorage.com"

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

  readonly uploadOrigin = ZERNIO_UPLOAD_ORIGIN

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
    providerAccountId: string,
    content: PostContent
  ): Promise<string> {
    const action = "schedule the post"
    const body = await request(action, () =>
      this.zernio().posts.createPost({
        throwOnError: true,
        body: {
          ...(content.caption && { content: content.caption }),
          mediaItems: content.media,
          platforms: [toTarget(providerAccountId, content)],
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
    providerAccountId: string,
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
          platforms: [toTarget(providerAccountId, content)],
          scheduledFor: content.scheduledFor,
        },
      })
    )
  }

  async getState(providerPostId: string): Promise<PublishingState> {
    const action = "load the post"
    const post = await this.find(action, providerPostId)
    if (post === null) return GONE
    const target = post?.platforms?.find(
      (platform) => platform.platform === "instagram"
    )
    if (!target || !post?.status)
      throw new ProviderError(
        `Couldn't ${action}. The response had no Instagram status.`
      )
    const status = STATUSES[post.status]
    return {
      status,
      platformPostId: target.platformPostId ?? null,
      permalink: target.platformPostUrl ?? null,
      error:
        status === "failed"
          ? (STATUS_ERRORS[post.status] ?? target.errorMessage ?? null)
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

function toTarget(providerAccountId: string, content: PostContent) {
  // Sent in full each time: an update replaces what was stored, so a story
  // that becomes a post loses its story setting.
  const platformSpecificData: InstagramPlatformData =
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
  return {
    platform: "instagram",
    accountId: providerAccountId,
    platformSpecificData,
  }
}
