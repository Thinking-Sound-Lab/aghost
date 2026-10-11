import type { AccountStatus } from "../../contract/account"
import type { ProductEvent } from "../analytics/analytics"

export type AccountRecord = {
  id: string
  workspaceId: string
  providerAccountId: string
  username: string
  displayName: string | null
  profilePictureUrl: string | null
  status: AccountStatus
  disconnectReason: string | null
  createdAt: string
}

/** The details of an account that come from the provider. */
export type AccountSnapshot = Pick<
  AccountRecord,
  | "providerAccountId"
  | "username"
  | "displayName"
  | "profilePictureUrl"
  | "status"
  | "disconnectReason"
>

/** An Instagram account as the provider currently reports it. */
export type ProviderAccount = {
  providerAccountId: string
  username: string
  displayName: string | null
  profilePictureUrl: string | null
  /** False when the provider can no longer act for the account. */
  connected: boolean
}

export const DISCONNECT_REASONS = {
  accessExpired: "Instagram access expired or was revoked.",
  removed: "This account is no longer connected.",
  planLimit:
    "Your plan has no room for another Instagram account. Upgrade to reconnect it.",
} as const

export type AccountState = Pick<AccountRecord, "status" | "disconnectReason">

/**
 * The event a change in an account's state amounts to, if any. Both the sync
 * after authorization and the provider's webhook report connections, so only
 * the first to change the stored state records one.
 */
export function accountChange(
  accountId: string,
  before: AccountState | null,
  after: AccountState
): ProductEvent | null {
  if (after.status === "connected")
    return before?.status === "connected"
      ? null
      : { name: "instagram_account_connected", account_id: accountId }
  if (
    before?.status === "disconnected" &&
    before.disconnectReason === after.disconnectReason
  )
    return null
  if (after.disconnectReason === DISCONNECT_REASONS.planLimit)
    return { name: "instagram_account_limit_reached", account_id: accountId }
  if (before?.status !== "connected") return null
  const known = Object.entries(DISCONNECT_REASONS).find(
    ([, text]) => text === after.disconnectReason
  )
  return {
    name: "instagram_account_disconnected",
    account_id: accountId,
    // The product's own reasons by name; the provider's as it sent them.
    reason: known?.[0] ?? after.disconnectReason ?? "unspecified",
  }
}
