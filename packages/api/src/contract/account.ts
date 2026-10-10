export const ACCOUNT_STATUSES = ["connected", "disconnected"] as const

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export type InstagramAccount = {
  id: string
  username: string
  displayName: string | null
  profilePictureUrl: string | null
  status: AccountStatus
  /** Why the account stopped working. Null while it is connected. */
  disconnectReason: string | null
  createdAt: string
}

/** A post or reel that exists on the connected Instagram account. */
export type InstagramPost = {
  platformPostId: string
  caption: string | null
  permalink: string | null
  thumbnailUrl: string | null
  mediaType: string | null
  publishedAt: string | null
  commentCount: number | null
  likeCount: number | null
}

export type ConnectInstagramResult = {
  /** Where to send the browser so the user can authorize the connection. */
  authUrl: string
}
