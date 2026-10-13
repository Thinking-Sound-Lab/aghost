import type {
  ApprovedAuthorization,
  AuthorizationRecord,
  NewAuthorization,
  NewOAuthClient,
  OAuthClientRecord,
  PendingAuthorization,
} from "./oauth"

export interface OAuthRepository {
  insertClient(client: NewOAuthClient): Promise<OAuthClientRecord>
  findClient(id: string): Promise<OAuthClientRecord | null>
  /** Records that the client completed a sign-in, which keeps it registered. */
  markClientUsed(id: string): Promise<void>
  /** Removes clients registered before then that never completed a sign-in. */
  deleteUnusedClients(registeredBefore: string): Promise<void>
  insertAuthorization(
    authorization: NewAuthorization
  ): Promise<AuthorizationRecord>
  /** Removes sign-ins that can no longer be approved or exchanged. */
  deleteExpired(): Promise<void>
  /** An unexpired request still waiting for the owner. */
  findPending(id: string): Promise<PendingAuthorization | null>
  /** Approves an unexpired pending request; null when it is not one. */
  approve(
    id: string,
    approval: { workspaceId: string; codeHash: string; expiresAt: string }
  ): Promise<AuthorizationRecord | null>
  /** Deletes an unexpired pending request; null when it is not one. */
  deny(id: string): Promise<AuthorizationRecord | null>
  /** Deletes the unexpired approval with this code, so a code works once. */
  redeem(codeHash: string): Promise<ApprovedAuthorization | null>
}
