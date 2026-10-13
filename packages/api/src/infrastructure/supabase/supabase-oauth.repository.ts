import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server"
import type { DatabaseClient } from "@workspace/supabase/server"
import type { Database } from "@workspace/supabase/types"
import type {
  ApprovedAuthorization,
  AuthorizationRecord,
  NewAuthorization,
  NewOAuthClient,
  OAuthClientRecord,
  PendingAuthorization,
} from "../../modules/oauth/oauth"
import type { OAuthRepository } from "../../modules/oauth/oauth.repository"
import { InternalError } from "../../shared/errors"
import { completed, optional, required } from "./query"

type Tables = Database["public"]["Tables"]
type ClientRow = Tables["oauth_clients"]["Row"]
type AuthorizationRow = Tables["oauth_authorizations"]["Row"]

function toClient(row: ClientRow): OAuthClientRecord {
  return {
    id: row.id,
    name: row.name,
    redirectUris: row.redirect_uris,
    secretHash: row.secret_hash,
  }
}

function toAuthorization(row: AuthorizationRow): AuthorizationRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    redirectUri: row.redirect_uri,
    codeChallenge: row.code_challenge,
    state: row.state,
    workspaceId: row.workspace_id,
    expiresAt: row.expires_at,
  }
}

/** Client secrets and codes are stored as hashes, reachable only by the backend. */
export class SupabaseOAuthRepository implements OAuthRepository {
  constructor(private readonly admin: DatabaseClient) {}

  async insertClient(client: NewOAuthClient): Promise<OAuthClientRecord> {
    const result = await this.admin
      .from("oauth_clients")
      .insert({
        name: client.name,
        redirect_uris: client.redirectUris,
        secret_hash: client.secretHash,
      })
      .select()
      .single()
    if (result.error?.code === "PT429")
      throw new OAuthError(
        OAuthErrorCode.TooManyRequests,
        "Too many apps have registered. Try again in one minute."
      )
    const row = required(result, "register an OAuth client")
    return toClient(row)
  }

  async findClient(id: string): Promise<OAuthClientRecord | null> {
    const row = optional(
      await this.admin
        .from("oauth_clients")
        .select()
        .eq("id", id)
        .maybeSingle(),
      "load an OAuth client"
    )
    return row ? toClient(row) : null
  }

  async markClientUsed(id: string): Promise<void> {
    completed(
      await this.admin
        .from("oauth_clients")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", id),
      "record an OAuth client's sign-in"
    )
  }

  async deleteUnusedClients(registeredBefore: string): Promise<void> {
    completed(
      await this.admin.rpc("delete_unused_oauth_clients", {
        registered_before: registeredBefore,
      }),
      "delete unused OAuth clients"
    )
  }

  async insertAuthorization(
    authorization: NewAuthorization
  ): Promise<AuthorizationRecord> {
    const row = required(
      await this.admin
        .from("oauth_authorizations")
        .insert({
          client_id: authorization.clientId,
          redirect_uri: authorization.redirectUri,
          code_challenge: authorization.codeChallenge,
          state: authorization.state,
          expires_at: authorization.expiresAt,
        })
        .select()
        .single(),
      "start an OAuth authorization"
    )
    return toAuthorization(row)
  }

  async deleteExpired(): Promise<void> {
    completed(
      await this.admin
        .from("oauth_authorizations")
        .delete()
        .lte("expires_at", new Date().toISOString()),
      "delete expired OAuth authorizations"
    )
  }

  async findPending(id: string): Promise<PendingAuthorization | null> {
    const row = optional(
      await this.admin
        .from("oauth_authorizations")
        .select("*, client:oauth_clients(name)")
        .eq("id", id)
        .is("code_hash", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle(),
      "load an OAuth authorization"
    )
    return row ? { ...toAuthorization(row), clientName: row.client.name } : null
  }

  async approve(
    id: string,
    approval: { workspaceId: string; codeHash: string; expiresAt: string }
  ): Promise<AuthorizationRecord | null> {
    const row = optional(
      await this.admin
        .from("oauth_authorizations")
        .update({
          workspace_id: approval.workspaceId,
          code_hash: approval.codeHash,
          expires_at: approval.expiresAt,
        })
        .eq("id", id)
        .is("code_hash", null)
        .gt("expires_at", new Date().toISOString())
        .select()
        .maybeSingle(),
      "approve an OAuth authorization"
    )
    return row ? toAuthorization(row) : null
  }

  async deny(id: string): Promise<AuthorizationRecord | null> {
    const row = optional(
      await this.admin
        .from("oauth_authorizations")
        .delete()
        .eq("id", id)
        .is("code_hash", null)
        .gt("expires_at", new Date().toISOString())
        .select()
        .maybeSingle(),
      "deny an OAuth authorization"
    )
    return row ? toAuthorization(row) : null
  }

  async redeem(codeHash: string): Promise<ApprovedAuthorization | null> {
    const row = optional(
      await this.admin
        .from("oauth_authorizations")
        .delete()
        .eq("code_hash", codeHash)
        .gt("expires_at", new Date().toISOString())
        .select()
        .maybeSingle(),
      "redeem an OAuth authorization code"
    )
    if (!row) return null
    const authorization = toAuthorization(row)
    // The approval check constraint sets both together.
    if (authorization.workspaceId === null)
      throw new InternalError(
        "An approved OAuth authorization has no workspace."
      )
    return { ...authorization, workspaceId: authorization.workspaceId }
  }
}
