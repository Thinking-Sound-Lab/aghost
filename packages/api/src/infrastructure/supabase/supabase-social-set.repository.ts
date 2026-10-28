import type { Database } from "@workspace/supabase/types"

import type { SocialSetCounts } from "../../modules/billing/plan-entitlements"
import type { SocialSetRecord } from "../../modules/social-sets/social-set"
import type { SocialSetRepository } from "../../modules/social-sets/social-set.repository"
import type { DataClients } from "./data-clients"
import { InternalError } from "../../shared/errors"
import { completed, optional, required } from "./query"

type SocialSetRow = Database["public"]["Tables"]["social_sets"]["Row"]

function toRecord(row: SocialSetRow): SocialSetRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    providerProfileId: row.zernio_profile_id,
    createdAt: row.created_at,
  }
}

export class SupabaseSocialSetRepository
  implements SocialSetRepository, SocialSetCounts
{
  constructor(private readonly db: DataClients) {}

  async countSocialSets(workspaceId: string): Promise<number> {
    const { count, error } = await this.db.scoped
      .from("social_sets")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
    completed({ error }, "count the social sets")
    if (count === null)
      throw new InternalError("The database did not count the social sets.")
    return count
  }

  async listByWorkspace(workspaceId: string): Promise<SocialSetRecord[]> {
    const rows = required(
      await this.db.scoped
        .from("social_sets")
        .select()
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
      "list the social sets"
    )
    return rows.map(toRecord)
  }

  async findById(
    workspaceId: string,
    id: string
  ): Promise<SocialSetRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("social_sets")
        .select()
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle(),
      "load the social set"
    )
    return row ? toRecord(row) : null
  }

  async create(workspaceId: string, name: string): Promise<SocialSetRecord> {
    const row = required(
      await this.db.privileged
        .from("social_sets")
        .insert({ workspace_id: workspaceId, name })
        .select()
        .single(),
      "create the social set"
    )
    return toRecord(row)
  }

  async rename(
    workspaceId: string,
    id: string,
    name: string
  ): Promise<SocialSetRecord> {
    const row = required(
      await this.db.privileged
        .from("social_sets")
        .update({ name })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select()
        .single(),
      "rename the social set"
    )
    return toRecord(row)
  }

  async setProviderProfileId(
    workspaceId: string,
    id: string,
    providerProfileId: string
  ): Promise<SocialSetRecord> {
    const row = required(
      await this.db.privileged
        .from("social_sets")
        .update({ zernio_profile_id: providerProfileId })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select()
        .single(),
      "store the social set's provider profile"
    )
    return toRecord(row)
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    completed(
      await this.db.privileged
        .from("social_sets")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id),
      "delete the social set"
    )
  }
}
