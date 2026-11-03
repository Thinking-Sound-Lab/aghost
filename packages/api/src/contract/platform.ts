import { z } from "zod"

/** The social networks a workspace connects through Zernio. */
export const PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "twitter",
  "threads",
  "youtube",
] as const

export type Platform = (typeof PLATFORMS)[number]

export const platformSchema = z.enum(PLATFORMS)

/** The per-post metrics the analytics API can report. */
export const CHANNEL_METRICS = [
  "impressions",
  "reach",
  "views",
  "likes",
  "comments",
  "shares",
  "saves",
  "clicks",
] as const

export type ChannelMetric = (typeof CHANNEL_METRICS)[number]

type PlatformRules = {
  name: string
  /** A caption's length, or a YouTube description's. */
  captionMaxLength: number
  /** Photos and videos in one post. */
  maxMedia: number
  /** False where a post can be text alone. */
  needsMedia: boolean
  /** Whether one post can combine photos and videos; if not, it has photos or one video. */
  mixesMedia: boolean
  videoOnly: boolean
  /** Stories, Trial Reels and comment-to-DM automations. */
  instagramFeatures: boolean
  /** Only YouTube videos have a title. */
  titleMaxLength: number | null
  /** What the platform's API reports for a post; the rest stay unknown. */
  metrics: readonly ChannelMetric[]
  /** The metric the analytics page charts by day. */
  primaryMetric: ChannelMetric
}

// Limits from each platform's Zernio guide. LinkedIn takes 20 photos, but a
// post here holds 10. X allows 25,000 characters only on paid accounts.
export const PLATFORM_RULES: Record<Platform, PlatformRules> = {
  instagram: {
    name: "Instagram",
    captionMaxLength: 2_200,
    maxMedia: 10,
    needsMedia: true,
    mixesMedia: true,
    videoOnly: false,
    instagramFeatures: true,
    titleMaxLength: null,
    // Meta replaced impressions with views for Instagram media in 2025.
    metrics: ["reach", "views", "likes", "comments", "shares", "saves"],
    primaryMetric: "reach",
  },
  facebook: {
    name: "Facebook",
    captionMaxLength: 63_206,
    maxMedia: 10,
    needsMedia: false,
    mixesMedia: false,
    videoOnly: false,
    instagramFeatures: false,
    titleMaxLength: null,
    metrics: ["impressions", "views", "likes", "comments", "shares", "clicks"],
    primaryMetric: "impressions",
  },
  linkedin: {
    name: "LinkedIn",
    captionMaxLength: 3_000,
    maxMedia: 10,
    needsMedia: false,
    mixesMedia: false,
    videoOnly: false,
    instagramFeatures: false,
    titleMaxLength: null,
    metrics: CHANNEL_METRICS,
    primaryMetric: "impressions",
  },
  twitter: {
    name: "X",
    captionMaxLength: 280,
    maxMedia: 4,
    needsMedia: false,
    mixesMedia: false,
    videoOnly: false,
    instagramFeatures: false,
    titleMaxLength: null,
    metrics: ["impressions", "views", "likes", "comments", "shares", "clicks"],
    primaryMetric: "impressions",
  },
  threads: {
    name: "Threads",
    captionMaxLength: 500,
    maxMedia: 10,
    needsMedia: false,
    mixesMedia: true,
    videoOnly: false,
    instagramFeatures: false,
    titleMaxLength: null,
    metrics: ["impressions", "views", "likes", "comments", "shares"],
    primaryMetric: "views",
  },
  youtube: {
    name: "YouTube",
    captionMaxLength: 5_000,
    maxMedia: 1,
    needsMedia: true,
    mixesMedia: false,
    videoOnly: true,
    instagramFeatures: false,
    titleMaxLength: 100,
    metrics: ["views", "likes", "comments", "shares"],
    primaryMetric: "views",
  },
}

/** The longest caption any platform takes. */
export const CAPTION_MAX_LENGTH = Math.max(
  ...PLATFORMS.map((platform) => PLATFORM_RULES[platform].captionMaxLength)
)

/** How to name an account: by @handle, or by its page's or channel's name. */
export function accountLabel(account: {
  platform: Platform
  username: string
  displayName: string | null
}): string {
  const handles = ["instagram", "twitter", "threads"]
  return handles.includes(account.platform)
    ? `@${account.username}`
    : (account.displayName ?? account.username)
}
