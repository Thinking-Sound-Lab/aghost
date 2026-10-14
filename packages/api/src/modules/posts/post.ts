import type {
  PostKind,
  PostMedia,
  ScheduledPostStatus,
} from "../../contract/post"

export type ScheduledPostRecord = {
  id: string
  workspaceId: string
  accountId: string
  providerPostId: string
  kind: PostKind
  caption: string | null
  media: PostMedia[]
  scheduledFor: string
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
  "kind" | "caption" | "media" | "scheduledFor"
>

/** How far publishing got, as the provider reports it. */
export type PublishingState = Pick<
  ScheduledPostRecord,
  "status" | "platformPostId" | "permalink" | "error" | "publishedAt"
>

export type NewScheduledPost = PostContent &
  Pick<ScheduledPostRecord, "workspaceId" | "accountId" | "providerPostId">

/** A published or failed post does not change again. */
export function isSettled(status: ScheduledPostStatus): boolean {
  return status === "published" || status === "failed"
}
