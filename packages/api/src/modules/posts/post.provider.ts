import type { Platform } from "../../contract/platform"
import type { CreateMediaUploadInput } from "../../contract/post"
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
  /** Cancels the post. Succeeds when it is already gone. */
  delete(providerPostId: string): Promise<void>
}
