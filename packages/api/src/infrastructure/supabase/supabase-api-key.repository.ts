import type { DatabaseClient } from "@workspace/supabase/server"
import type { Database } from "@workspace/supabase/types"
import { z } from "zod"
import { API_KEY_SCOPES } from "../../contract/api-key"
import type {
  ApiKeyRecord,
  ApiKeyRepository,
  NewApiKey,
} from "../../modules/api-keys/api-key.repository"
import { optional, required } from "./query"

type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"]

function toRecord(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    prefix: row.token_prefix,
    scopes: z.array(z.enum(API_KEY_SCOPES)).parse(row.scopes),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }
}

/** Key hashes are accessible only to the backend's service role. */
export class SupabaseApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly admin: DatabaseClient) {}

  async list(workspaceId: string): Promise<ApiKeyRecord[]> {
    const rows = required(
      await this.admin
        .from("api_keys")
        .select()
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      "list API keys"
    )
    return rows.map(toRecord)
  }

  async insert(key: NewApiKey): Promise<ApiKeyRecord> {
    const row = required(
      await this.admin
        .from("api_keys")
        .insert({
          workspace_id: key.workspaceId,
          name: key.name,
          token_hash: key.tokenHash,
          token_prefix: key.prefix,
          scopes: key.scopes,
          expires_at: key.expiresAt,
        })
        .select()
        .single(),
      "create an API key"
    )
    return toRecord(row)
  }

  async revoke(workspaceId: string, id: string): Promise<ApiKeyRecord | null> {
    const row = optional(
      await this.admin
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select()
        .maybeSingle(),
      "revoke an API key"
    )
    return row ? toRecord(row) : null
  }

  async use(tokenHash: string): Promise<ApiKeyRecord | null> {
    const now = new Date().toISOString()
    const row = optional(
      await this.admin
        .from("api_keys")
        .update({ last_used_at: now })
        .eq("token_hash", tokenHash)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .select()
        .maybeSingle(),
      "authenticate an API key"
    )
    return row ? toRecord(row) : null
  }
}
