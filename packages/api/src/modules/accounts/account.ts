import type { AccountStatus } from "../../contract/account"

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
} as const
