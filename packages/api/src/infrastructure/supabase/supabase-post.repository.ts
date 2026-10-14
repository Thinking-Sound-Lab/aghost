import type { Database } from "@workspace/supabase/types"
import { z } from "zod"

import {
  POST_KINDS,
  SCHEDULED_POST_STATUSES,
  postMediaSchema,
  type ScheduledPostRange,
  type ScheduledPostStatus,
} from "../../contract/post"
import type {
  NewScheduledPost,
  PostContent,
  PublishingState,
  ScheduledPostRecord,
} from "../../modules/posts/post"
import type { ScheduledPostRepository } from "../../modules/posts/post.repository"
import type { DataClients } from "./data-clients"
import { completed, optional, required } from "./query"

type PostRow = Database["public"]["Tables"]["scheduled_posts"]["Row"]

// Each post comes with the ids of the automations that answer its comments.
const COLUMNS = "*, automations(id)"

const kindSchema = z.enum(POST_KINDS)
const statusSchema = z.enum(SCHEDULED_POST_STATUSES)
const mediaSchema = z.array(postMediaSchema)

function toRecord(
  row: PostRow & { automations: { id: string }[] }
): ScheduledPostRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    accountId: row.instagram_account_id,
    providerPostId: row.zernio_post_id,
    kind: kindSchema.parse(row.kind),
    caption: row.caption,
    media: mediaSchema.parse(row.media),
    scheduledFor: new Date(row.scheduled_for).toISOString(),
    status: statusSchema.parse(row.status),
    platformPostId: row.platform_post_id,
    permalink: row.permalink,
    error: row.error,
    publishedAt: row.published_at && new Date(row.published_at).toISOString(),
    automationIds: row.automations.map((automation) => automation.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toContentColumns(content: PostContent) {
  return {
    kind: content.kind,
    caption: content.caption,
    media: content.media,
    scheduled_for: content.scheduledFor,
  }
}

export class SupabasePostRepository implements ScheduledPostRepository {
  constructor(private readonly db: DataClients) {}

  listByRange(
    workspaceId: string,
    range: ScheduledPostRange
  ): Promise<ScheduledPostRecord[]> {
    return this.list(workspaceId, { range })
  }

  listByAccount(
    workspaceId: string,
    accountId: string
  ): Promise<ScheduledPostRecord[]> {
    return this.list(workspaceId, { accountId })
  }

  listScheduled(workspaceId: string): Promise<ScheduledPostRecord[]> {
    return this.list(workspaceId, { status: "scheduled" })
  }

  private async list(
    workspaceId: string,
    filter: {
      range?: ScheduledPostRange
      accountId?: string
      status?: ScheduledPostStatus
    }
  ): Promise<ScheduledPostRecord[]> {
    const posts: ScheduledPostRecord[] = []
    // Supabase limits a response to 1,000 rows. Collect every page, with an
    // ID tie-breaker for posts scheduled for the same moment.
    const pageSize = 1_000
    for (let offset = 0; ; offset += pageSize) {
      let query = this.db.scoped
        .from("scheduled_posts")
        .select(COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("scheduled_for")
        .order("id")
      if (filter.range)
        query = query
          .gte("scheduled_for", filter.range.from)
          .lt("scheduled_for", filter.range.to)
      if (filter.accountId)
        query = query.eq("instagram_account_id", filter.accountId)
      if (filter.status) query = query.eq("status", filter.status)
      const rows = required(
        await query.range(offset, offset + pageSize - 1),
        "list scheduled posts"
      )
      posts.push(...rows.map(toRecord))
      if (rows.length < pageSize) return posts
    }
  }

  async findById(
    workspaceId: string,
    id: string
  ): Promise<ScheduledPostRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("scheduled_posts")
        .select(COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle(),
      "load the scheduled post"
    )
    return row ? toRecord(row) : null
  }

  async insert(post: NewScheduledPost): Promise<ScheduledPostRecord> {
    const row = required(
      await this.db.privileged
        .from("scheduled_posts")
        .insert({
          ...toContentColumns(post),
          workspace_id: post.workspaceId,
          instagram_account_id: post.accountId,
          zernio_post_id: post.providerPostId,
          status: "scheduled",
        })
        .select(COLUMNS)
        .single(),
      "save the scheduled post"
    )
    return toRecord(row)
  }

  async updateContent(
    workspaceId: string,
    id: string,
    content: PostContent
  ): Promise<ScheduledPostRecord> {
    const row = required(
      await this.db.privileged
        .from("scheduled_posts")
        .update(toContentColumns(content))
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select(COLUMNS)
        .single(),
      "update the scheduled post"
    )
    return toRecord(row)
  }

  async updateState(
    workspaceId: string,
    id: string,
    from: ScheduledPostStatus,
    state: PublishingState
  ): Promise<boolean> {
    const rows = required(
      await this.db.privileged
        .from("scheduled_posts")
        .update({
          status: state.status,
          platform_post_id: state.platformPostId,
          permalink: state.permalink,
          error: state.error,
          published_at: state.publishedAt,
        })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .eq("status", from)
        .select("id"),
      "store the post's publishing status"
    )
    return rows.length > 0
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    completed(
      await this.db.privileged
        .from("scheduled_posts")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id),
      "delete the scheduled post"
    )
  }
}
