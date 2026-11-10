import type { Platform } from "../../contract/platform"
import type {
  FacebookSettings,
  PostKind,
  PostMedia,
  ScheduledPostStatus,
  TikTokSettings,
  TrialReel,
  YouTubeSettings,
} from "../../contract/post"

export type ScheduledPostRecord = {
  id: string
  workspaceId: string
  accountId: string
  /** The account's platform, which the post is published on. */
  platform: Platform
  providerPostId: string
  kind: PostKind
  caption: string | null
  media: PostMedia[]
  scheduledFor: string
  trialReel: TrialReel | null
  youtube: YouTubeSettings | null
  facebook: FacebookSettings | null
  tiktok: TikTokSettings | null
  status: ScheduledPostStatus
  platformPostId: string | null
  permalink: string | null
  error: string | null
  publishedAt: string | null
  automationIds: string[]
  createdAt: string
  updatedAt: string
}

/** What is published, and when. */
export type PostContent = Pick<
  ScheduledPostRecord,
  | "kind"
  | "caption"
  | "media"
  | "scheduledFor"
  | "trialReel"
  | "youtube"
  | "facebook"
  | "tiktok"
>

/** How far publishing got, as the provider reports it. */
export type PublishingState = Pick<
  ScheduledPostRecord,
  "status" | "platformPostId" | "permalink" | "error" | "publishedAt"
>

export type NewScheduledPost = PostContent &
  Pick<
    ScheduledPostRecord,
    "workspaceId" | "accountId" | "platform" | "providerPostId"
  >

/** The account a post is published on, as the provider knows it. */
export type PublishingAccount = {
  providerAccountId: string
  platform: Platform
}

/** A published or failed post does not change again. */
export function isSettled(status: ScheduledPostStatus): boolean {
  return status === "published" || status === "failed"
}

const LINK_WAIT_MS = 24 * 60 * 60 * 1000

/**
 * TikTok links a published post minutes later, and never links a private
 * one, so a published post is asked about for a day until it has a link.
 */
export function awaitsLink(post: ScheduledPostRecord): boolean {
  return (
    post.platform === "tiktok" &&
    post.status === "published" &&
    post.permalink === null &&
    Date.now() - Date.parse(post.publishedAt ?? post.scheduledFor) <
      LINK_WAIT_MS
  )
}
