import type { Platform } from "../../contract/platform"
import type {
  FacebookSettings,
  PostKind,
  PostMedia,
  ScheduledPostStatus,
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
