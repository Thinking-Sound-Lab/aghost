import type { AccountStatus } from "../../contract/account"
import type { Platform } from "../../contract/platform"
import type { ProductEvent } from "../analytics/analytics"

export type AccountRecord = {
  id: string
  workspaceId: string
  providerAccountId: string
  platform: Platform
  username: string
  displayName: string | null
  profilePictureUrl: string | null
  status: AccountStatus
  disconnectReason: string | null
  socialSetId: string
  /** Its social set's provider profile, which holds the account. */
  providerProfileId: string | null
  /**
   * It shared a platform with another account before social sets, so it may
   * still reconnect beside it in the first set.
   */
  sharedPlatformBeforeSets: boolean
  createdAt: string
}

/** The details of an account that come from the provider. */
export type AccountSnapshot = Pick<
  AccountRecord,
  | "providerAccountId"
  | "platform"
  | "username"
  | "displayName"
  | "profilePictureUrl"
  | "status"
  | "disconnectReason"
>

/** An account as the provider currently reports it. */
export type ProviderAccount = {
  providerAccountId: string
  platform: Platform
  username: string
  displayName: string | null
  profilePictureUrl: string | null
  /** False when the provider can no longer act for the account. */
  connected: boolean
}

export const DISCONNECT_REASONS = {
  accessExpired: "Access expired or was revoked.",
  removed: "This account is no longer connected.",
  planLimit:
    "Your plan has no room for another channel. Upgrade to reconnect it.",
  // The database writes both plan reasons; the provider then lets go of the
  // account, since aghost won't use it.
  setTaken:
    "This social set already has an account on this platform. Connect it to another set.",
} as const

/** The database turned the connection away, so the provider shouldn't keep it. */
export function isRejected(reason: string | null): boolean {
  return (
    reason === DISCONNECT_REASONS.planLimit ||
    reason === DISCONNECT_REASONS.setTaken
  )
}

export type AccountState = Pick<AccountRecord, "status" | "disconnectReason">

/**
 * The event a change in an account's state amounts to, if any. Both the sync
 * after authorization and the provider's webhook report connections, so only
 * the first to change the stored state records one.
 */
export function accountChange(
  account: Pick<AccountRecord, "id" | "platform">,
  before: AccountState | null,
  after: AccountState
): ProductEvent | null {
  const subject = { account_id: account.id, platform: account.platform }
  if (after.status === "connected")
    return before?.status === "connected"
      ? null
      : { name: "instagram_account_connected", ...subject }
  if (
    before?.status === "disconnected" &&
    before.disconnectReason === after.disconnectReason
  )
    return null
  if (after.disconnectReason === DISCONNECT_REASONS.planLimit)
    return { name: "instagram_account_limit_reached", ...subject }
  if (before?.status !== "connected") return null
  const known = Object.entries(DISCONNECT_REASONS).find(
    ([, text]) => text === after.disconnectReason
  )
  return {
    name: "instagram_account_disconnected",
    ...subject,
    // The product's own reasons by name; the provider's as it sent them.
    reason: known?.[0] ?? after.disconnectReason ?? "unspecified",
  }
}
