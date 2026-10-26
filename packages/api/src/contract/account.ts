import { z } from "zod"

import { platformSchema, type Platform } from "./platform"

export const ACCOUNT_STATUSES = ["connected", "disconnected"] as const

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/** A connected social account: a channel posts are published on. */
export type Account = {
  id: string
  platform: Platform
  /** The handle, or a Page's or channel's name where the platform has no handle. */
  username: string
  displayName: string | null
  profilePictureUrl: string | null
  status: AccountStatus
  /** Why the account stopped working. Null while it is connected. */
  disconnectReason: string | null
  /** The social set it belongs to, which has one account on each platform. */
  socialSetId: string
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

/** Whether aghost may publish posts on the account. */
export type PublishingAccess = { canPublish: boolean }

export const connectAccountSchema = z.object({
  // Dashboards from before other platforms send no platform: they connect
  // Instagram, the only one they knew.
  platform: platformSchema.default("instagram"),
  // Dashboards from before social sets send none: they connect to the
  // workspace's first set, the only one they knew.
  socialSetId: z.uuid().optional(),
})

export type ConnectAccountResult = {
  /** Where to send the browser so the user can authorize the connection. */
  authUrl: string
}
