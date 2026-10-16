import type { PostMedia } from "../../contract/post"

export type UploadLinkRecord = {
  id: string
  workspaceId: string
  /** Null until the owner uploads the files. */
  media: PostMedia[] | null
  expiresAt: string
  uploadedAt: string | null
  createdAt: string
}

export type NewUploadLink = Pick<UploadLinkRecord, "workspaceId" | "expiresAt">
