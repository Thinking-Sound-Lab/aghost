import type { Platform } from "../../contract/platform"
import type {
  CreateMediaUploadInput,
  TikTokCreator,
  TikTokCreatorQuery,
} from "../../contract/post"
import type { PostContent, PublishingAccount, PublishingState } from "./post"

/** Where to upload a file, and the public address it gets. */
export type UploadTarget = {
  uploadUrl: string
  publicUrl: string
  expiresAt: string
}

/** The service that stores scheduled posts and publishes them on time. */
export interface PublishingProvider {
  /** False until the account grants permission to publish. */
  canPublish(providerAccountId: string): Promise<boolean>
  createUpload(file: CreateMediaUploadInput): Promise<UploadTarget>
  /** Schedules the post and returns the provider's id for it. */
  schedule(account: PublishingAccount, content: PostContent): Promise<string>
  reschedule(
    providerPostId: string,
    account: PublishingAccount,
    content: PostContent
  ): Promise<void>
  getState(providerPostId: string, platform: Platform): Promise<PublishingState>
  /** What the TikTok creator allows a post of this media type to be. */
  getTikTokCreator(
    providerAccountId: string,
    mediaType: TikTokCreatorQuery["mediaType"]
  ): Promise<TikTokCreator>
  /** Cancels the post. Succeeds when it is already gone. */
  delete(providerPostId: string): Promise<void>
}
