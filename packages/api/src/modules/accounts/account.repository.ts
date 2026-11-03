import type { AccountRecord, AccountSnapshot } from "./account"

export interface AccountRepository {
  listByWorkspace(workspaceId: string): Promise<AccountRecord[]>
  findById(workspaceId: string, id: string): Promise<AccountRecord | null>
  /**
   * Stores the account under the workspace, replacing what was known about
   * it. A new account joins the set; a stored one stays in its own.
   */
  save(
    workspaceId: string,
    socialSetId: string,
    snapshot: AccountSnapshot
  ): Promise<AccountRecord>
  markDisconnected(
    workspaceId: string,
    id: string,
    reason: string
  ): Promise<void>
  /** Returns false when no account with that provider id is stored. */
  markDisconnectedByProviderId(
    providerAccountId: string,
    reason: string
  ): Promise<boolean>
  delete(workspaceId: string, id: string): Promise<void>
}
