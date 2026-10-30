import { z } from "zod"

import { postAutomationSchema } from "./automation"
import { CAPTION_MAX_LENGTH, PLATFORM_RULES, type Platform } from "./platform"

export const POST_LIMITS = {
  maxMediaItems: 10,
  // Larger files are compressed for Instagram before they are published.
  imageMaxBytes: 20 * 1024 * 1024,
  videoMaxBytes: 300 * 1024 * 1024,
  filenameMaxLength: 200,
  /** How far ahead of now a post has to be scheduled. */
  minLeadMinutes: 5,
  /** The longest period one list request can cover. */
  maxRangeDays: 92,
  /** How long the owner has to upload files through an upload link. */
  uploadLinkHours: 24,
  /** Accounts one post can be published on at once. */
  maxTargets: 50,
} as const

/** A feed post (one photo, a reel from one video, or a carousel) or a story. */
export const POST_KINDS = ["post", "story"] as const
export const SCHEDULED_POST_STATUSES = [
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const
const MEDIA_TYPES = ["image", "video"] as const

/** The files Instagram publishes, and what each one is. */
export const MEDIA_CONTENT_TYPES = {
  "image/jpeg": "image",
  "image/png": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
} as const

export type PostKind = (typeof POST_KINDS)[number]
export type ScheduledPostStatus = (typeof SCHEDULED_POST_STATUSES)[number]
type MediaType = (typeof MEDIA_TYPES)[number]
export type MediaContentType = keyof typeof MEDIA_CONTENT_TYPES

export const trialReelSchema = z
  .object({
    graduationStrategy: z
      .enum(["manual", "automatic"])
      .describe(
        "manual: share with everyone later in Instagram. automatic: let Instagram share based on performance with non-followers."
      ),
  })
  .describe(
    "Launch one video as a Trial Reel, shown to non-followers first. These are launch settings, not the reel's current graduation status."
  )

export type TrialReel = z.infer<typeof trialReelSchema>

/** One video publishes as a reel; multiple items publish as a carousel. */
export function isReelMedia(media: PostMedia[]): boolean {
  return media.length === 1 && media[0]?.type === "video"
}

/** A video's frame in pixels and its length, as its file reports them. */
export type VideoShape = { width: number; height: number; seconds: number }

const YOUTUBE_SHORT_MAX_SECONDS = 180

/** YouTube publishes a vertical or square video up to 3 minutes long as a Short. */
export function isYouTubeShort(video: VideoShape): boolean {
  return (
    video.height >= video.width && video.seconds <= YOUTUBE_SHORT_MAX_SECONDS
  )
}

// From Meta's Reels publishing guide. Zernio does not check them, so a video
// outside them fails when it publishes.
const FACEBOOK_REEL_SECONDS = { min: 3, max: 90 }

/** Where a video can't be a Facebook Reel, or null when it fits. */
export function facebookReelProblem(video: VideoShape): string | null {
  return video.height >= video.width &&
    video.seconds >= FACEBOOK_REEL_SECONDS.min &&
    video.seconds <= FACEBOOK_REEL_SECONDS.max
    ? null
    : `A Facebook Reel is a vertical video of ${FACEBOOK_REEL_SECONDS.min} to ${FACEBOOK_REEL_SECONDS.max} seconds`
}

const MAX_BYTES: Record<MediaType, number> = {
  image: POST_LIMITS.imageMaxBytes,
  video: POST_LIMITS.videoMaxBytes,
}

const dateTimeSchema = z.iso.datetime({
  offset: true,
  error: "Use an ISO 8601 date and time, like 2026-10-20T09:00:00Z",
})

export const postMediaSchema = z.object({
  url: z
    .string()
    .trim()
    .pipe(
      z.url({
        protocol: /^https$/,
        error: "Use a public link that starts with https://",
      })
    ),
  type: z.enum(MEDIA_TYPES),
})

export type PostMedia = z.infer<typeof postMediaSchema>

const captionSchema = z
  .string()
  .trim()
  .max(CAPTION_MAX_LENGTH, `Use ${CAPTION_MAX_LENGTH} characters or fewer`)

const postContentShape = {
  kind: z.enum(POST_KINDS),
  caption: captionSchema.default(""),
  // In order: the first item is the cover of a carousel. Each platform's own
  // limits are checked against the account the post is published on.
  media: z
    .array(postMediaSchema)
    .max(
      POST_LIMITS.maxMediaItems,
      `Add up to ${POST_LIMITS.maxMediaItems} photos or videos`
    ),
  scheduledFor: dateTimeSchema,
}

/** A YouTube video's settings. */
export const youtubeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the video a title")
    .max(
      PLATFORM_RULES.youtube.titleMaxLength!,
      `Use ${PLATFORM_RULES.youtube.titleMaxLength} characters or fewer`
    ),
  madeForKids: z
    .boolean()
    .describe(
      "YouTube's audience setting: whether the video is made for kids."
    ),
})

export type YouTubeSettings = z.infer<typeof youtubeSchema>

/** How a Facebook copy publishes. */
export const facebookSchema = z.object({
  reel: z
    .boolean()
    .describe(
      "true publishes one vertical video of 3 to 90 seconds as a Facebook Reel; false publishes a feed post."
    ),
})

export type FacebookSettings = z.infer<typeof facebookSchema>

type PostShape = {
  kind: PostKind
  caption: string
  media: PostMedia[]
  trialReel?: TrialReel | null
  automation?: unknown
}

function checkKind(ctx: z.core.ParsePayload<PostShape>): void {
  const { kind, caption, media, trialReel, automation } = ctx.value
  const issue = (path: string, message: string) =>
    ctx.issues.push({ code: "custom", input: ctx.value, path: [path], message })
  if (trialReel && (kind !== "post" || !isReelMedia(media)))
    issue(
      "trialReel",
      "A Trial Reel needs exactly one video and cannot be a story"
    )
  if (kind !== "story") return
  if (media.length !== 1) issue("media", "A story has one photo or video")
  if (caption) issue("caption", "Stories have no caption")
  if (automation) issue("automation", "Stories have no comments to answer")
}

/** What one platform's copy of a post holds, for checking against its rules. */
export type PlatformPost = {
  kind: PostKind
  caption: string | null
  media: PostMedia[]
  trialReel: TrialReel | null
  youtube: YouTubeSettings | null
  facebook: FacebookSettings | null
  hasAutomation: boolean
}

/**
 * Where a post breaks the rules of the platform it is published on, by field.
 * Each message names the platform, since one post can go to several.
 */
export function platformProblems(
  platform: Platform,
  post: PlatformPost
): Record<string, string> {
  const rules = PLATFORM_RULES[platform]
  const { name } = rules
  const problems: Record<string, string> = {}
  const videos = post.media.filter((item) => item.type === "video").length
  if (!rules.instagramFeatures) {
    if (post.kind === "story") problems.kind = `${name} has no stories here`
    if (post.trialReel) problems.trialReel = "Trial Reels are for Instagram"
    if (post.hasAutomation)
      problems.automation = "Comment-to-DM automations are for Instagram"
  }
  if (platform !== "facebook" && post.facebook)
    problems.facebook = "Facebook settings are for Facebook"
  if ((post.caption?.length ?? 0) > rules.captionMaxLength)
    problems.caption = `${name} takes up to ${rules.captionMaxLength.toLocaleString("en")} characters`
  if (rules.videoOnly && (post.media.length !== 1 || videos !== 1))
    problems.media = `${name} needs one video`
  else if (
    platform === "facebook" &&
    post.facebook?.reel &&
    !isReelMedia(post.media)
  )
    problems.media = "A Facebook Reel needs one video"
  else if (rules.needsMedia && post.media.length === 0)
    problems.media = `${name} needs a photo or video`
  else if (post.media.length > rules.maxMedia)
    problems.media = `${name} takes up to ${rules.maxMedia} photos`
  else if (!rules.mixesMedia && videos > 0 && post.media.length > 1)
    problems.media = `${name} takes several photos or one video`
  else if (!post.caption && post.media.length === 0)
    problems.caption = "Write something or add a photo or video"
  if (rules.titleMaxLength !== null && !post.youtube)
    problems["youtube.title"] = "Give the video a title"
  if (rules.titleMaxLength === null && post.youtube)
    problems.youtube = `${name} videos have no title`
  return problems
}

export const schedulePostSchema = z
  .object({
    instagramAccountId: z.uuid("Choose an Instagram account"),
    ...postContentShape,
    trialReel: trialReelSchema.nullable().default(null),
    // Answers comments on this post once it is published.
    automation: postAutomationSchema.nullable().default(null),
  })
  .check(checkKind)

export const updateScheduledPostSchema = z
  .object({
    ...postContentShape,
    // Older clients omit this field when editing. Keep the saved setting.
    trialReel: trialReelSchema
      .nullable()
      .optional()
      .describe(
        "Omit to preserve Trial Reel settings; null makes a regular reel."
      ),
    youtube: youtubeSchema
      .nullable()
      .optional()
      .describe(
        "A YouTube video's title and audience. Omit to keep them; other platforms have none."
      ),
    facebook: facebookSchema
      .nullable()
      .optional()
      .describe(
        "A Facebook post's format, which can't change once scheduled. Omit to keep it; other platforms have none."
      ),
    automation: postAutomationSchema.nullable().default(null),
  })
  .check(checkKind)

/** One account a post is published on, with what differs there. */
const postTargetSchema = z.object({
  accountId: z.uuid("Choose an account"),
  // Replaces the shared caption on this account, for example a shorter one for X.
  caption: captionSchema.nullable().default(null),
  youtube: youtubeSchema.nullable().default(null),
  // Null on a Facebook account publishes a feed post.
  facebook: facebookSchema.nullable().default(null),
})

/** The same post scheduled on several accounts, each publishing its own copy. */
export const crossPostSchema = z
  .object({
    targets: z
      .array(postTargetSchema)
      .min(1, "Choose at least one account")
      .max(POST_LIMITS.maxTargets)
      .refine(
        (targets) =>
          new Set(targets.map((target) => target.accountId)).size ===
          targets.length,
        "Choose each account once"
      ),
    ...postContentShape,
    trialReel: trialReelSchema.nullable().default(null),
    // Answers comments on the Instagram copies once they are published.
    automation: postAutomationSchema.nullable().default(null),
  })
  .check(checkKind)

export type SchedulePostInput = z.input<typeof schedulePostSchema>
export type ParsedSchedulePostInput = z.output<typeof schedulePostSchema>
export type UpdateScheduledPostInput = z.input<typeof updateScheduledPostSchema>
export type ParsedUpdateScheduledPostInput = z.output<
  typeof updateScheduledPostSchema
>
export type CrossPostInput = z.input<typeof crossPostSchema>
export type ParsedCrossPostInput = z.output<typeof crossPostSchema>

export const scheduledPostRangeSchema = z
  .object({ from: dateTimeSchema, to: dateTimeSchema })
  .check((ctx) => {
    const days =
      (Date.parse(ctx.value.to) - Date.parse(ctx.value.from)) / 86_400_000
    if (days <= 0 || days > POST_LIMITS.maxRangeDays)
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["to"],
        message: `Use a period of up to ${POST_LIMITS.maxRangeDays} days that ends after it starts`,
      })
  })

export type ScheduledPostRange = z.infer<typeof scheduledPostRangeSchema>

export const createMediaUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(POST_LIMITS.filenameMaxLength),
    contentType: z.enum(
      Object.keys(MEDIA_CONTENT_TYPES) as [
        MediaContentType,
        ...MediaContentType[],
      ],
      { error: "Upload a JPEG or PNG photo, or an MP4 or MOV video" }
    ),
    size: z.number().int().positive(),
  })
  .check((ctx) => {
    const type = MEDIA_CONTENT_TYPES[ctx.value.contentType]
    const max = MAX_BYTES[type]
    if (ctx.value.size > max)
      ctx.issues.push({
        code: "custom",
        input: ctx.value.size,
        path: ["size"],
        message: `Use a ${type} of ${max / 1024 / 1024} MB or less`,
      })
  })

export type CreateMediaUploadInput = z.infer<typeof createMediaUploadSchema>

/**
 * Where to upload one file. PUT its bytes to `uploadUrl` with the same
 * Content-Type, then schedule the post with `media`.
 */
export type MediaUpload = {
  uploadUrl: string
  media: PostMedia
  /** The upload URL stops working at this time. */
  expiresAt: string
}

type UploadLinkStatus = "waiting" | "uploaded" | "expired"

/**
 * A page where the owner uploads photos and videos from their browser, for an
 * agent that cannot send files to storage itself.
 */
export type UploadLink = {
  id: string
  /** The page to give the owner. */
  url: string
  status: UploadLinkStatus
  /** The uploaded files in the owner's order; empty until they are uploaded. */
  media: PostMedia[]
  /** The page stops taking files at this time. */
  expiresAt: string
  uploadedAt: string | null
}

export const completeUploadLinkSchema = z.object({
  media: z
    .array(postMediaSchema)
    .min(1, "Add a photo or video")
    .max(
      POST_LIMITS.maxMediaItems,
      `Add up to ${POST_LIMITS.maxMediaItems} photos or videos`
    ),
})

export type CompleteUploadLinkInput = z.infer<typeof completeUploadLinkSchema>

export function uploadLinkPath(linkId: string): string {
  return `/upload?${new URLSearchParams({ link: linkId })}`
}

export function uploadLinkLoginPath(linkId: string): string {
  return `/login?${new URLSearchParams({ next: "upload", link: linkId })}`
}

export type ScheduledPost = {
  id: string
  /** The account the post is published on. */
  accountId: string
  platform: Platform
  /** The same as accountId, kept for clients written for Instagram alone. */
  instagramAccountId: string
  kind: PostKind
  caption: string | null
  media: PostMedia[]
  scheduledFor: string
  /** How the reel was configured to launch, not its current graduation state. */
  trialReel: TrialReel | null
  /** A YouTube video's title and audience; null on other platforms. */
  youtube: YouTubeSettings | null
  /** Whether a Facebook post is a reel; null on other platforms. */
  facebook: FacebookSettings | null
  status: ScheduledPostStatus
  /** The platform's id for the post, once it is published. */
  platformPostId: string | null
  permalink: string | null
  /** Why publishing failed. Null unless the status is failed. */
  error: string | null
  publishedAt: string | null
  /** Automations that answer comments on this post. */
  automationIds: string[]
  createdAt: string
  updatedAt: string
}
