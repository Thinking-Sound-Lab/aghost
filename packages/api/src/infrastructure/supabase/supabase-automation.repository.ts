import type { Database } from "@workspace/supabase/types"
import { z } from "zod"

import {
  AUTOMATION_STATUSES,
  MATCH_MODES,
  POST_SCOPES,
  dmButtonSchema,
  type AutomationStatus,
  type AutomationTrigger,
  type OpeningDm,
} from "../../contract/automation"
import type {
  AutomationConfig,
  AutomationRecord,
  NewAutomation,
} from "../../modules/automations/automation"
import type { AutomationRepository } from "../../modules/automations/automation.repository"
import { InternalError } from "../../shared/errors"
import type { DataClients } from "./data-clients"
import { completed, optional, required } from "./query"

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"] & {
  scheduled_post: { caption: string | null } | null
}
type AutomationConfigColumns = Pick<
  AutomationRow,
  | "name"
  | "post_scope"
  | "platform_post_id"
  | "scheduled_post_id"
  | "post_caption"
  | "post_permalink"
  | "keywords"
  | "match_mode"
  | "opening_dm_message"
  | "opening_dm_button"
  | "dm_message"
  | "dm_buttons"
  | "comment_reply"
  | "require_follow"
>

// A scheduled post's caption is read with the automation, so it stays current
// when the post is edited.
const COLUMNS = "*, scheduled_post:scheduled_posts(caption)"

const statusSchema = z.enum(AUTOMATION_STATUSES)
const postScopeSchema = z.enum(POST_SCOPES)
const matchModeSchema = z.enum(MATCH_MODES)
const dmButtonsSchema = z.array(dmButtonSchema)

function toTrigger(row: AutomationRow): AutomationTrigger {
  const scope = postScopeSchema.parse(row.post_scope)

  if (scope === "any_post") {
    return { postScope: "any_post" }
  }

  if (scope === "scheduled_post") {
    if (row.scheduled_post_id === null || row.scheduled_post === null) {
      throw new InternalError(
        `Automation ${row.id} targets a scheduled post that is not stored.`
      )
    }

    return {
      postScope: "scheduled_post",
      scheduledPost: {
        id: row.scheduled_post_id,
        caption: row.scheduled_post.caption,
      },
    }
  }

  if (row.platform_post_id === null) {
    throw new InternalError(
      `Automation ${row.id} targets a specific post but stores no post id.`
    )
  }

  return {
    postScope: "specific_post",
    post: {
      platformPostId: row.platform_post_id,
      caption: row.post_caption,
      permalink: row.post_permalink,
    },
  }
}

function toOpeningDm(row: AutomationRow): OpeningDm | null {
  const { opening_dm_message: message, opening_dm_button: buttonLabel } = row

  if (message === null && buttonLabel === null) {
    return null
  }

  if (message === null || buttonLabel === null) {
    throw new InternalError(
      `Automation ${row.id} stores only part of its opening DM.`
    )
  }

  return { message, buttonLabel }
}

function toRecord(row: AutomationRow): AutomationRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    accountId: row.instagram_account_id,
    providerAutomationId: row.zernio_automation_id,
    name: row.name,
    status: statusSchema.parse(row.status),
    trigger: toTrigger(row),
    keywords: row.keywords,
    matchMode: matchModeSchema.parse(row.match_mode),
    openingDm: toOpeningDm(row),
    dmMessage: row.dm_message,
    dmButtons: dmButtonsSchema.parse(row.dm_buttons),
    commentReply: row.comment_reply,
    requireFollow: row.require_follow,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toConfigColumns(config: AutomationConfig): AutomationConfigColumns {
  const post =
    config.trigger.postScope === "specific_post" ? config.trigger.post : null

  return {
    name: config.name,
    post_scope: config.trigger.postScope,
    platform_post_id: post ? post.platformPostId : null,
    post_caption: post ? post.caption : null,
    post_permalink: post ? post.permalink : null,
    scheduled_post_id:
      config.trigger.postScope === "scheduled_post"
        ? config.trigger.scheduledPost.id
        : null,
    keywords: config.keywords,
    match_mode: config.matchMode,
    opening_dm_message: config.openingDm ? config.openingDm.message : null,
    opening_dm_button: config.openingDm ? config.openingDm.buttonLabel : null,
    dm_message: config.dmMessage,
    dm_buttons: config.dmButtons,
    comment_reply: config.commentReply,
    require_follow: config.requireFollow,
  }
}

export class SupabaseAutomationRepository implements AutomationRepository {
  constructor(private readonly db: DataClients) {}

  async listByWorkspace(workspaceId: string): Promise<AutomationRecord[]> {
    return this.list(workspaceId)
  }

  async listByAccount(
    workspaceId: string,
    accountId: string
  ): Promise<AutomationRecord[]> {
    return this.list(workspaceId, {
      column: "instagram_account_id",
      id: accountId,
    })
  }

  async listByScheduledPost(
    workspaceId: string,
    postId: string
  ): Promise<AutomationRecord[]> {
    return this.list(workspaceId, { column: "scheduled_post_id", id: postId })
  }

  private async list(
    workspaceId: string,
    owner?: { column: "instagram_account_id" | "scheduled_post_id"; id: string }
  ): Promise<AutomationRecord[]> {
    const automations: AutomationRecord[] = []
    // Supabase limits a response to 1,000 rows. Collect all pages before a
    // caller pauses or deletes anything, with an ID tie-breaker for rows
    // created together. Mutating callers hold workspace ownership throughout.
    const pageSize = 1_000
    for (let offset = 0; ; offset += pageSize) {
      let query = this.db.scoped
        .from("automations")
        .select(COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
      if (owner) query = query.eq(owner.column, owner.id)
      const rows = required(
        await query.range(offset, offset + pageSize - 1),
        "list automations"
      )
      automations.push(...rows.map(toRecord))
      if (rows.length < pageSize) return automations
    }
  }

  async findById(
    workspaceId: string,
    id: string
  ): Promise<AutomationRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("automations")
        .select(COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle(),
      "load the automation"
    )

    return row ? toRecord(row) : null
  }

  async insert(automation: NewAutomation): Promise<AutomationRecord> {
    const row = required(
      await this.db.privileged
        .from("automations")
        .insert({
          ...toConfigColumns(automation),
          workspace_id: automation.workspaceId,
          instagram_account_id: automation.accountId,
          zernio_automation_id: automation.providerAutomationId,
          status: automation.status,
        })
        .select(COLUMNS)
        .single(),
      "save the automation"
    )

    return toRecord(row)
  }

  async updateConfig(
    workspaceId: string,
    id: string,
    config: AutomationConfig,
    status: AutomationStatus
  ): Promise<AutomationRecord> {
    const row = required(
      await this.db.privileged
        .from("automations")
        .update({ ...toConfigColumns(config), status })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select(COLUMNS)
        .single(),
      "update the automation"
    )

    return toRecord(row)
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    status: AutomationStatus
  ): Promise<AutomationRecord> {
    const row = required(
      await this.db.privileged
        .from("automations")
        .update({ status })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select(COLUMNS)
        .single(),
      "update the automation's status"
    )

    return toRecord(row)
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    completed(
      await this.db.privileged
        .from("automations")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id),
      "delete the automation"
    )
  }
}
