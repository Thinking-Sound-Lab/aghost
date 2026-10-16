import type { PostMedia } from "../../contract/post"
import type { NewUploadLink, UploadLinkRecord } from "./upload-link"

export interface UploadLinkRepository {
  insert(link: NewUploadLink): Promise<UploadLinkRecord>
  findById(workspaceId: string, id: string): Promise<UploadLinkRecord | null>
  /**
   * Stores the files unless the link was used or expired meanwhile, and
   * returns the link, or null when it did not store them.
   */
  complete(
    workspaceId: string,
    id: string,
    media: PostMedia[]
  ): Promise<UploadLinkRecord | null>
  deleteCreatedBefore(workspaceId: string, time: string): Promise<void>
}
