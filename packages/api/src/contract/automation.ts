import { z } from "zod"

export const AUTOMATION_LIMITS = {
  nameMaxLength: 80,
  maxKeywords: 20,
  keywordMaxLength: 40,
  dmMessageMaxLength: 1000,
  // Instagram delivers a message with buttons as a button template, which
  // allows less text than a plain message.
  dmMessageWithButtonsMaxLength: 640,
  maxDmButtons: 3,
  dmButtonLabelMaxLength: 20,
  commentReplyMaxLength: 300,
  // The opening DM is sent with its button as a button template.
  openingDmMaxLength: 640,
  maxCarouselCards: 10,
  carouselTextMaxLength: 80,
  followUpMinDelayMinutes: 30,
  followUpMaxDelayMinutes: 1200,
} as const

/** Placeholders the sender replaces with the commenter's details. */
export const PERSONALIZATION_TOKENS = [
  { token: "{{first_name}}", label: "First name" },
  { token: "{{name}}", label: "Full name" },
  { token: "{{username}}", label: "Username" },
] as const

export const AUTOMATION_STATUSES = ["active", "paused"] as const
export const POST_SCOPES = [
  "specific_post",
  "any_post",
  "scheduled_post",
] as const
export const MATCH_MODES = ["contains", "word", "exact"] as const

export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number]
export type PostScope = (typeof POST_SCOPES)[number]
export type MatchMode = (typeof MATCH_MODES)[number]

function atMost(max: number): string {
  return `Use ${max} characters or fewer`
}

function uniqueIgnoringCase(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = value.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export const dmButtonSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Add a button label")
    .max(
      AUTOMATION_LIMITS.dmButtonLabelMaxLength,
      atMost(AUTOMATION_LIMITS.dmButtonLabelMaxLength)
    ),
  url: z
    .string()
    .trim()
    .pipe(
      z.url({
        protocol: /^https$/,
        error: "Enter a link that starts with https://",
      })
    ),
})

export type DmButton = z.infer<typeof dmButtonSchema>

/** Sent first; the main DM follows when the commenter taps its button. */
const openingDmSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write the opening message")
    .max(
      AUTOMATION_LIMITS.openingDmMaxLength,
      atMost(AUTOMATION_LIMITS.openingDmMaxLength)
    ),
  buttonLabel: z
    .string()
    .trim()
    .min(1, "Add a button label")
    .max(
      AUTOMATION_LIMITS.dmButtonLabelMaxLength,
      atMost(AUTOMATION_LIMITS.dmButtonLabelMaxLength)
    ),
})

export type OpeningDm = z.infer<typeof openingDmSchema>

const productCardSchema = z.object({
  title: z.string().trim().min(1, "Add a product title").max(80),
  subtitle: z.string().trim().max(80).default(""),
  imageUrl: dmButtonSchema.shape.url,
  buttonLabel: dmButtonSchema.shape.label,
  url: dmButtonSchema.shape.url,
})
export const productCarouselSchema = z
  .array(productCardSchema)
  .min(1, "Add a product card")
  .max(AUTOMATION_LIMITS.maxCarouselCards)
export type ProductCard = z.infer<typeof productCardSchema>

export const followUpSchema = z.object({
  message: z.string().trim().min(1, "Write the reminder").max(640),
  delayMinutes: z
    .number()
    .int()
    .min(AUTOMATION_LIMITS.followUpMinDelayMinutes)
    .max(AUTOMATION_LIMITS.followUpMaxDelayMinutes),
  button: dmButtonSchema.nullable().default(null),
})
export type FollowUp = z.infer<typeof followUpSchema>

const automationTriggerInputSchema = z.discriminatedUnion("postScope", [
  z.object({ postScope: z.literal("any_post") }),
  z.object({
    postScope: z.literal("specific_post"),
    platformPostId: z.string().min(1, "Choose a post"),
  }),
  // A post scheduled in aghost: the automation starts when it publishes.
  z.object({
    postScope: z.literal("scheduled_post"),
    scheduledPostId: z.uuid("Choose a scheduled post"),
  }),
])

export type AutomationTriggerInput = z.infer<
  typeof automationTriggerInputSchema
>

// What an automation sends, without the post that triggers it.
const automationResponseShape = {
  name: z
    .string()
    .trim()
    .min(1, "Give the automation a name")
    .max(
      AUTOMATION_LIMITS.nameMaxLength,
      atMost(AUTOMATION_LIMITS.nameMaxLength)
    ),
  // No keywords means every comment triggers the automation.
  keywords: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Keywords can't be empty")
        .max(
          AUTOMATION_LIMITS.keywordMaxLength,
          atMost(AUTOMATION_LIMITS.keywordMaxLength)
        )
    )
    .max(
      AUTOMATION_LIMITS.maxKeywords,
      `Use ${AUTOMATION_LIMITS.maxKeywords} keywords or fewer`
    )
    .transform(uniqueIgnoringCase),
  matchMode: z.enum(MATCH_MODES),
  // Null sends the main DM straight away.
  openingDm: openingDmSchema.nullable(),
  dmMessage: z
    .string()
    .trim()
    .min(1, "Write the message to send")
    .max(
      AUTOMATION_LIMITS.dmMessageMaxLength,
      atMost(AUTOMATION_LIMITS.dmMessageMaxLength)
    ),
  dmButtons: z
    .array(dmButtonSchema)
    .max(
      AUTOMATION_LIMITS.maxDmButtons,
      `Add up to ${AUTOMATION_LIMITS.maxDmButtons} buttons`
    ),
  // Null means the comment gets no public reply.
  commentReply: z
    .string()
    .trim()
    .min(1, "Write the public reply or turn it off")
    .max(
      AUTOMATION_LIMITS.commentReplyMaxLength,
      atMost(AUTOMATION_LIMITS.commentReplyMaxLength)
    )
    .nullable(),
  requireFollow: z.boolean(),
  // Omitted by older clients. Updates preserve the stored values; null clears.
  productCarousel: productCarouselSchema.nullable().optional(),
  followUp: followUpSchema.nullable().optional(),
}

const automationConfigShape = {
  ...automationResponseShape,
  trigger: automationTriggerInputSchema,
}

type MessageWithButtons = {
  dmMessage: string
  dmButtons: DmButton[]
  productCarousel?: ProductCard[] | null
}

function checkMessageFitsButtons(
  ctx: z.core.ParsePayload<MessageWithButtons>
): void {
  const { dmMessage, dmButtons } = ctx.value
  const limit = AUTOMATION_LIMITS.dmMessageWithButtonsMaxLength

  if (ctx.value.productCarousel && dmButtons.length > 0) {
    ctx.issues.push({
      code: "custom",
      input: dmButtons,
      path: ["dmButtons"],
      message: "Choose link buttons or a product carousel for this DM.",
    })
  }

  if (dmButtons.length > 0 && dmMessage.length > limit) {
    ctx.issues.push({
      code: "custom",
      input: dmMessage,
      path: ["dmMessage"],
      message: `Messages with buttons can be up to ${limit} characters`,
    })
  }
}

export const createAutomationSchema = z
  .object({
    ...automationConfigShape,
    instagramAccountId: z.uuid("Choose an Instagram account"),
    status: z.enum(AUTOMATION_STATUSES),
  })
  .check(checkMessageFitsButtons)

export const updateAutomationSchema = z
  .object({ ...automationConfigShape, status: z.enum(AUTOMATION_STATUSES) })
  .check(checkMessageFitsButtons)

/** An automation created together with the scheduled post it answers on. */
export const postAutomationSchema = z
  .object({ ...automationResponseShape, status: z.enum(AUTOMATION_STATUSES) })
  .check(checkMessageFitsButtons)

export const setAutomationStatusSchema = z.object({
  status: z.enum(AUTOMATION_STATUSES),
})

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>
export type PostAutomationInput = z.infer<typeof postAutomationSchema>
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>

export const ACTIVITY_PAGE_MAX_LIMIT = 50

const nonNegativeInteger = z
  .string()
  .regex(/^\d+$/, "Expected a whole number")
  .transform(Number)

export const activityPageQuerySchema = z.object({
  limit: nonNegativeInteger.pipe(
    z.number().min(1).max(ACTIVITY_PAGE_MAX_LIMIT)
  ),
  offset: nonNegativeInteger,
})

export type AutomationTrigger =
  | { postScope: "any_post" }
  | {
      postScope: "specific_post"
      post: {
        platformPostId: string
        caption: string | null
        permalink: string | null
      }
    }
  | {
      postScope: "scheduled_post"
      scheduledPost: { id: string; caption: string | null }
    }

export type Automation = {
  id: string
  instagramAccountId: string
  name: string
  status: AutomationStatus
  trigger: AutomationTrigger
  keywords: string[]
  matchMode: MatchMode
  openingDm: OpeningDm | null
  dmMessage: string
  dmButtons: DmButton[]
  commentReply: string | null
  requireFollow: boolean
  productCarousel: ProductCard[] | null
  followUp: FollowUp | null
  createdAt: string
  updatedAt: string
}

/**
 * Running counters reported by the sending platform. A counter is null when
 * the platform did not report it, which is different from zero.
 */
export type AutomationStats = {
  /** Comments that matched the trigger. */
  triggered: number | null
  dmsSent: number | null
  dmsFailed: number | null
  uniqueContacts: number | null
  /** DMs that carried a click-tracked link: the denominator for click rate. */
  trackedSends: number | null
  linkClicks: number | null
  uniqueClicks: number | null
}

/** Stats keyed by automation id. An automation without an entry has none yet. */
export type AutomationStatsById = Record<string, AutomationStats>

export type DmDeliveryStatus =
  "pending" | "sent" | "failed" | "skipped" | "gated"
type CommentReplyStatus = "pending" | "sent" | "failed" | "skipped"

/** One comment that triggered an automation, and what happened next. */
export type AutomationActivity = {
  id: string
  commenterUsername: string | null
  commenterName: string | null
  commentText: string | null
  dmStatus: DmDeliveryStatus
  /** Why the DM failed or was skipped. Null when it was sent. */
  dmError: string | null
  /** Null when the automation has no public reply. */
  commentReplyStatus: CommentReplyStatus | null
  linkClicks: number | null
  occurredAt: string
}

export type AutomationActivityPage = {
  entries: AutomationActivity[]
  total: number
  hasMore: boolean
  followUps?: FollowUpActivity[]
}

export type FollowUpActivity = {
  id: string
  recipient: string | null
  status: "pending" | "processing" | "sent" | "cancelled" | "failed"
  dueAt: string
  sentAt: string | null
  reason: string | null
}
