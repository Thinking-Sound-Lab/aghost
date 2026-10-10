import type { ApiKey } from "../../contract/api-key"

export type ApiKeyRecord = ApiKey & { workspaceId: string }
export type NewApiKey = Pick<
  ApiKey,
  "name" | "prefix" | "scopes" | "expiresAt"
> & {
  workspaceId: string
  tokenHash: string
}

export interface ApiKeyRepository {
  list(workspaceId: string): Promise<ApiKeyRecord[]>
  insert(key: NewApiKey): Promise<ApiKeyRecord>
  revoke(workspaceId: string, id: string): Promise<ApiKeyRecord | null>
  /** Only an active key can be used; records its use in the same statement. */
  use(tokenHash: string): Promise<ApiKeyRecord | null>
}
