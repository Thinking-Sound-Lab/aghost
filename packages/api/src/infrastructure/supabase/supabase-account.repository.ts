import type { Database } from "@workspace/supabase/types"
import { z } from "zod"

import { ACCOUNT_STATUSES } from "../../contract/account"
import { platformSchema } from "../../contract/platform"
import type {
  AccountRecord,
  AccountSnapshot,
} from "../../modules/accounts/account"
import type { AccountRepository } from "../../modules/accounts/account.repository"
import type { DataClients } from "./data-clients"
import { completed, optional, required } from "./query"
import { ConflictError, InternalError } from "../../shared/errors"

type AccountRow = Database["public"]["Tables"]["instagram_accounts"]["Row"]

const statusSchema = z.enum(ACCOUNT_STATUSES)

function toRecord(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    providerAccountId: row.zernio_account_id,
    platform: platformSchema.parse(row.platform),
    username: row.username,
    displayName: row.display_name,
    profilePictureUrl: row.profile_picture_url,
    status: statusSchema.parse(row.status),
    disconnectReason: row.disconnect_reason,
    createdAt: row.created_at,
  }
}

export class SupabaseAccountRepository implements AccountRepository {
  constructor(private readonly db: DataClients) {}

  async listByWorkspace(workspaceId: string): Promise<AccountRecord[]> {
    const rows = required(
      await this.db.scoped
        .from("instagram_accounts")
        .select()
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
      "list the connected accounts"
    )

    return rows.map(toRecord)
  }

  async countConnected(workspaceId: string): Promise<number> {
    const { count, error } = await this.db.scoped
      .from("instagram_accounts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
    completed({ error }, "count the connected accounts")
    if (count === null) {
      throw new InternalError(
        "The database did not count the connected accounts."
      )
    }
    return count
  }

  async findById(
    workspaceId: string,
    id: string
  ): Promise<AccountRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("instagram_accounts")
        .select()
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle(),
      "load the account"
    )

    return row ? toRecord(row) : null
  }

  async save(
    workspaceId: string,
    snapshot: AccountSnapshot
  ): Promise<AccountRecord> {
    // A provider id is unique across workspaces. Never reassign an existing
    // account during sync, even if the provider reports it in another profile.
    // Its platform never changes, so only a new row is given one.
    const values = {
      username: snapshot.username,
      display_name: snapshot.displayName,
      profile_picture_url: snapshot.profilePictureUrl,
      status: snapshot.status,
      disconnect_reason: snapshot.disconnectReason,
    }
    completed(
      await this.db.privileged.from("instagram_accounts").upsert(
        {
          workspace_id: workspaceId,
          zernio_account_id: snapshot.providerAccountId,
          platform: snapshot.platform,
          ...values,
        },
        { onConflict: "zernio_account_id", ignoreDuplicates: true }
      ),
      "register the account"
    )
    const row = optional(
      await this.db.privileged
        .from("instagram_accounts")
        .update(values)
        .eq("workspace_id", workspaceId)
        .eq("zernio_account_id", snapshot.providerAccountId)
        .select()
        .maybeSingle(),
      "save the account"
    )
    if (!row)
      throw new ConflictError(
        "This account is already connected to another workspace."
      )
    return toRecord(row)
  }

  async markDisconnected(
    workspaceId: string,
    id: string,
    reason: string
  ): Promise<void> {
    completed(
      await this.db.privileged
        .from("instagram_accounts")
        .update({ status: "disconnected", disconnect_reason: reason })
        .eq("workspace_id", workspaceId)
        .eq("id", id),
      "mark the account as disconnected"
    )
  }

  async markDisconnectedByProviderId(
    providerAccountId: string,
    reason: string
  ): Promise<boolean> {
    const rows = required(
      await this.db.privileged
        .from("instagram_accounts")
        .update({ status: "disconnected", disconnect_reason: reason })
        .eq("zernio_account_id", providerAccountId)
        .select("id"),
      "mark the account as disconnected"
    )

    return rows.length > 0
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    completed(
      await this.db.privileged
        .from("instagram_accounts")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id),
      "delete the account"
    )
  }
}
