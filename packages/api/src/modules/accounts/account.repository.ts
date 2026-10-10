import type { AccountRecord, AccountSnapshot } from "./account"

export interface AccountRepository {
  listByWorkspace(workspaceId: string): Promise<AccountRecord[]>
  countConnected(workspaceId: string): Promise<number>
  findById(workspaceId: string, id: string): Promise<AccountRecord | null>
  /** Stores the account under the workspace, replacing what was known about it. */
  save(workspaceId: string, snapshot: AccountSnapshot): Promise<AccountRecord>
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
