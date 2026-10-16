import type { Database } from "@workspace/supabase/types"
import { z } from "zod"

import { postMediaSchema, type PostMedia } from "../../contract/post"
import type {
  NewUploadLink,
  UploadLinkRecord,
} from "../../modules/posts/upload-link"
import type { UploadLinkRepository } from "../../modules/posts/upload-link.repository"
import type { DataClients } from "./data-clients"
import { completed, optional, required } from "./query"

type UploadLinkRow = Database["public"]["Tables"]["upload_links"]["Row"]

const mediaSchema = z.array(postMediaSchema).nullable()

const isoTime = (value: string) => new Date(value).toISOString()

function toRecord(row: UploadLinkRow): UploadLinkRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    media: mediaSchema.parse(row.media),
    expiresAt: isoTime(row.expires_at),
    uploadedAt: row.uploaded_at && isoTime(row.uploaded_at),
    createdAt: row.created_at,
  }
}

export class SupabaseUploadLinkRepository implements UploadLinkRepository {
  constructor(private readonly db: DataClients) {}

  async insert(link: NewUploadLink): Promise<UploadLinkRecord> {
    const row = required(
      await this.db.privileged
        .from("upload_links")
        .insert({ workspace_id: link.workspaceId, expires_at: link.expiresAt })
        .select()
        .single(),
      "create the upload link"
    )
    return toRecord(row)
  }

  async findById(
    workspaceId: string,
    id: string
  ): Promise<UploadLinkRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("upload_links")
        .select()
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle(),
      "load the upload link"
    )
    return row ? toRecord(row) : null
  }

  async complete(
    workspaceId: string,
    id: string,
    media: PostMedia[]
  ): Promise<UploadLinkRecord | null> {
    const now = new Date().toISOString()
    const row = optional(
      await this.db.privileged
        .from("upload_links")
        .update({ media, uploaded_at: now })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .is("uploaded_at", null)
        .gt("expires_at", now)
        .select()
        .maybeSingle(),
      "store the uploaded files"
    )
    return row ? toRecord(row) : null
  }

  async deleteCreatedBefore(workspaceId: string, time: string): Promise<void> {
    completed(
      await this.db.privileged
        .from("upload_links")
        .delete()
        .eq("workspace_id", workspaceId)
        .lt("created_at", time),
      "delete old upload links"
    )
  }
}
