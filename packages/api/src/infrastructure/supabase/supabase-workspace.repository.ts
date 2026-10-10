import type { Database } from "@workspace/supabase/types"

import type { WorkspaceRecord } from "../../modules/workspaces/workspace"
import type { WorkspaceRepository } from "../../modules/workspaces/workspace.repository"
import type { DataClients } from "./data-clients"
import { optional, required } from "./query"

type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"]

function toRecord(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    providerProfileId: row.zernio_profile_id,
  }
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: DataClients) {}

  async findByOwnerId(ownerId: string): Promise<WorkspaceRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("workspaces")
        .select()
        .eq("owner_id", ownerId)
        .maybeSingle(),
      "load the workspace"
    )

    return row ? toRecord(row) : null
  }

  async findByProviderProfileId(
    providerProfileId: string
  ): Promise<WorkspaceRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("workspaces")
        .select()
        .eq("zernio_profile_id", providerProfileId)
        .maybeSingle(),
      "find the workspace for a provider profile"
    )

    return row ? toRecord(row) : null
  }

  async rename(id: string, name: string): Promise<WorkspaceRecord> {
    const row = required(
      await this.db.privileged
        .from("workspaces")
        .update({ name })
        .eq("id", id)
        .select()
        .single(),
      "rename the workspace"
    )

    return toRecord(row)
  }

  async setProviderProfileId(
    id: string,
    providerProfileId: string
  ): Promise<WorkspaceRecord> {
    const row = required(
      await this.db.privileged
        .from("workspaces")
        .update({ zernio_profile_id: providerProfileId })
        .eq("id", id)
        .select()
        .single(),
      "store the workspace's provider profile"
    )

    return toRecord(row)
  }
}
