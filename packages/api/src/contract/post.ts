import { z } from "zod"

import { postAutomationSchema } from "./automation"

export const POST_LIMITS = {
  captionMaxLength: 2200,
  maxMediaItems: 10,
  // Larger files are compressed for Instagram before they are published.
  imageMaxBytes: 20 * 1024 * 1024,
  videoMaxBytes: 300 * 1024 * 1024,
  filenameMaxLength: 200,
  /** How far ahead of now a post has to be scheduled. */
  minLeadMinutes: 5,
  /** The longest period one list request can cover. */
  maxRangeDays: 92,
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

const postContentShape = {
  kind: z.enum(POST_KINDS),
  caption: z
    .string()
    .trim()
    .max(
      POST_LIMITS.captionMaxLength,
      `Use ${POST_LIMITS.captionMaxLength} characters or fewer`
    )
    .default(""),
  // In order: the first item is the cover of a carousel.
  media: z
    .array(postMediaSchema)
    .min(1, "Add a photo or video")
    .max(
      POST_LIMITS.maxMediaItems,
      `Add up to ${POST_LIMITS.maxMediaItems} photos or videos`
    ),
  scheduledFor: dateTimeSchema,
}

type PostShape = {
  kind: PostKind
  caption: string
  media: PostMedia[]
  automation?: unknown
}

function checkKind(ctx: z.core.ParsePayload<PostShape>): void {
  const { kind, caption, media, automation } = ctx.value
  if (kind !== "story") return
  const issue = (path: string, message: string) =>
    ctx.issues.push({ code: "custom", input: ctx.value, path: [path], message })
  if (media.length > 1) issue("media", "A story has one photo or video")
  if (caption) issue("caption", "Stories have no caption")
  if (automation) issue("automation", "Stories have no comments to answer")
}

export const schedulePostSchema = z
  .object({
    instagramAccountId: z.uuid("Choose an Instagram account"),
    ...postContentShape,
    // Answers comments on this post once it is published.
    automation: postAutomationSchema.nullable().default(null),
  })
  .check(checkKind)

export const updateScheduledPostSchema = z
  .object({
    ...postContentShape,
    automation: postAutomationSchema.nullable().default(null),
  })
  .check(checkKind)

export type SchedulePostInput = z.input<typeof schedulePostSchema>
export type ParsedSchedulePostInput = z.output<typeof schedulePostSchema>
export type UpdateScheduledPostInput = z.input<typeof updateScheduledPostSchema>
export type ParsedUpdateScheduledPostInput = z.output<
  typeof updateScheduledPostSchema
>

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

export type ScheduledPost = {
  id: string
  instagramAccountId: string
  kind: PostKind
  caption: string | null
  media: PostMedia[]
  scheduledFor: string
  status: ScheduledPostStatus
  /** Instagram's id for the post, once it is published. */
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
