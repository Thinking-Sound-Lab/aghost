import type {
  CommentAutomationAudience,
  CommentAutomationFollowGate,
  CommentAutomationLog,
  CommentAutomationStats,
  DmButton as ZernioDmButton,
} from "@zernio/node"

import type {
  AutomationActivity,
  AutomationActivityPage,
  AutomationStats,
  AutomationStatus,
  DmButton,
  OpeningDm,
} from "../../contract/automation"
import type { AutomationConfig } from "../../modules/automations/automation"
import type {
  ActivityPageRequest,
  AutomationProvider,
  AutomationTarget,
  PostBinding,
} from "../../modules/automations/automation.provider"
import { ConflictError, ProviderError } from "../../shared/errors"
import {
  causeOf,
  hasStatus,
  request,
  requestDeletion,
  toProviderError,
  type ZernioAccess,
} from "./zernio-client"

// Zernio shows the post title next to the automation in its own tools.
const POST_TITLE_MAX_LENGTH = 120

// Instagram only reveals whether someone follows the account once they have
// messaged it, so first-time commenters get a one-tap confirmation and the DM
// follows once they do follow.
const FOLLOWERS_ONLY: CommentAutomationAudience = {
  followerStatus: "follower",
  whenUnknown: "verify",
}

const EVERYONE: CommentAutomationAudience = {
  followerStatus: "any",
  whenUnknown: "send",
}

// Every commenter gets the opening DM, and the DM follows when they tap its
// button. Zernio refuses tap-to-unlock together with a follower rule.
const TAP_TO_UNLOCK: CommentAutomationAudience = {
  followerStatus: "any",
  tapToUnlock: true,
}

// Zernio uses its default copy for empty fields, which removes an opening DM.
const DEFAULT_FOLLOW_GATE: CommentAutomationFollowGate = {
  message: "",
  buttonLabel: "",
}

const POST_TAKEN_MESSAGE =
  "Another active automation already uses this post. Pause or delete it first."

export class ZernioAutomationProvider implements AutomationProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async create(
    target: AutomationTarget,
    config: AutomationConfig,
    status: AutomationStatus,
    post: PostBinding
  ): Promise<string> {
    const action = "create the automation"
    const { platformPostId, postId, postTitle } = toPostFields(post)

    const body = await this.write(action, () =>
      this.zernio().commentautomations.createCommentAutomation({
        throwOnError: true,
        body: {
          profileId: target.providerProfileId,
          accountId: target.providerAccountId,
          name: config.name,
          // Leaving the post out makes the automation account-wide.
          ...(platformPostId && { platformPostId }),
          ...(postId && { postId }),
          ...(postTitle && { postTitle }),
          keywords: config.keywords,
          matchMode: config.matchMode,
          dmMessage: config.dmMessage,
          buttons: config.dmButtons.map(toZernioButton),
          ...(config.productCarousel && {
            template: toTemplate(config.productCarousel),
          }),
          ...(config.commentReply && { commentReply: config.commentReply }),
          audience: toAudience(config),
          ...(config.openingDm && {
            followGate: toFollowGate(config.openingDm),
          }),
          isActive: status === "active",
        },
      })
    )

    const providerAutomationId = body.automation?.id

    if (!providerAutomationId) {
      throw new ProviderError(
        `Couldn't ${action}. The response had no automation id.`
      )
    }

    return providerAutomationId
  }

  async update(
    providerAutomationId: string,
    config: AutomationConfig,
    status: AutomationStatus,
    post: PostBinding | null
  ): Promise<void> {
    await this.write("update the automation", () =>
      this.zernio().commentautomations.updateCommentAutomation({
        throwOnError: true,
        path: { automationId: providerAutomationId },
        body: {
          name: config.name,
          isActive: status === "active",
          // The three post fields move as a unit: all null makes the
          // automation account-wide, and leaving them out keeps its post.
          ...(post && toPostFields(post)),
          keywords: config.keywords,
          matchMode: config.matchMode,
          dmMessage: config.dmMessage,
          // An empty list removes the buttons.
          buttons: config.dmButtons.map(toZernioButton),
          // Explicitly clear the old body shape when switching message types.
          template: config.productCarousel
            ? toTemplate(config.productCarousel)
            : null,
          // An empty string removes the public reply.
          commentReply: config.commentReply ?? "",
          // An audience without tapToUnlock turns tap-to-unlock off.
          audience: toAudience(config),
          followGate: config.openingDm
            ? toFollowGate(config.openingDm)
            : DEFAULT_FOLLOW_GATE,
        },
      })
    )
  }

  async setStatus(
    providerAutomationId: string,
    status: AutomationStatus
  ): Promise<void> {
    const action =
      status === "active" ? "turn the automation on" : "pause the automation"

    await this.write(action, () =>
      this.zernio().commentautomations.updateCommentAutomation({
        throwOnError: true,
        path: { automationId: providerAutomationId },
        body: { isActive: status === "active" },
      })
    )
  }

  delete(providerAutomationId: string): Promise<void> {
    return requestDeletion("delete the automation", () =>
      this.zernio().commentautomations.deleteCommentAutomation({
        throwOnError: true,
        path: { automationId: providerAutomationId },
      })
    )
  }

  async listStats(
    providerProfileId: string
  ): Promise<Map<string, AutomationStats>> {
    const action = "load automation stats"

    const body = await request(action, () =>
      this.zernio().commentautomations.listCommentAutomations({
        throwOnError: true,
        query: { profileId: providerProfileId },
      })
    )

    const statsByProviderId = new Map<string, AutomationStats>()

    // `automations` is optional in the API: a profile without any omits it.
    if (!body.automations) {
      return statsByProviderId
    }

    for (const automation of body.automations) {
      if (!automation.id) {
        throw new ProviderError(
          `Couldn't ${action}. An automation in the response had no id.`
        )
      }

      statsByProviderId.set(automation.id, toStats(automation.stats))
    }

    return statsByProviderId
  }

  async listActivity(
    providerAutomationId: string,
    page: ActivityPageRequest
  ): Promise<AutomationActivityPage> {
    const action = "load the automation's activity"

    const body = await request(action, () =>
      this.zernio().commentautomations.listCommentAutomationLogs({
        throwOnError: true,
        path: { automationId: providerAutomationId },
        query: { limit: page.limit, skip: page.offset },
      })
    )

    const total = body.pagination?.total
    const hasMore = body.pagination?.hasMore

    if (!body.logs || total === undefined || hasMore === undefined) {
      throw new ProviderError(
        `Couldn't ${action}. The response was missing its entries or page details.`
      )
    }

    return { entries: body.logs.map(toActivity), total, hasMore }
  }

  /**
   * Sends a create or update. Zernio answers 409 when the post already has an
   * active automation.
   */
  private async write<Result extends { data?: unknown }>(
    action: string,
    send: () => Promise<Result>
  ): Promise<NonNullable<Result["data"]>> {
    try {
      return await request(action, send)
    } catch (error) {
      if (hasStatus(causeOf(error), 409)) {
        throw new ConflictError(POST_TAKEN_MESSAGE, error)
      }

      throw toProviderError(action, error)
    }
  }
}

/**
 * A published post is watched by its Instagram id. A scheduled one is watched
 * by Zernio's id, and Zernio starts the automation when it publishes.
 */
function toPostFields(post: PostBinding) {
  if (post.scope === "any_post")
    return { platformPostId: null, postId: null, postTitle: null }
  const postTitle = post.caption
    ? post.caption.slice(0, POST_TITLE_MAX_LENGTH)
    : null
  return post.scope === "platform_post"
    ? { platformPostId: post.platformPostId, postId: null, postTitle }
    : { platformPostId: null, postId: post.providerPostId, postTitle }
}

/**
 * With a follower rule the opening DM doubles as the follow confirmation: it
 * goes to commenters Instagram cannot vouch for, and known followers get the
 * DM straight away.
 */
function toAudience(config: AutomationConfig): CommentAutomationAudience {
  if (config.requireFollow) {
    return FOLLOWERS_ONLY
  }

  return config.openingDm ? TAP_TO_UNLOCK : EVERYONE
}

function toFollowGate(openingDm: OpeningDm): CommentAutomationFollowGate {
  return { message: openingDm.message, buttonLabel: openingDm.buttonLabel }
}

function toZernioButton(button: DmButton): ZernioDmButton {
  return { type: "url", title: button.label, url: button.url }
}

function toTemplate(cards: NonNullable<AutomationConfig["productCarousel"]>) {
  return {
    type: "generic" as const,
    elements: cards.map((card) => ({
      title: card.title,
      subtitle: card.subtitle,
      imageUrl: card.imageUrl,
      buttons: [
        { type: "url" as const, title: card.buttonLabel, url: card.url },
      ],
    })),
  }
}

function toStats(stats: CommentAutomationStats | undefined): AutomationStats {
  // Each counter is optional in the API. A missing counter stays unknown
  // instead of being reported as zero.
  return {
    triggered: stats?.triggered ?? null,
    dmsSent: stats?.dmsSent ?? null,
    dmsFailed: stats?.dmsFailed ?? null,
    uniqueContacts: stats?.uniqueContacts ?? null,
    trackedSends: stats?.trackedSends ?? null,
    linkClicks: stats?.linkClicks ?? null,
    uniqueClicks: stats?.uniqueClicks ?? null,
  }
}

function toActivity(log: CommentAutomationLog): AutomationActivity {
  if (!log.id || !log.status || !log.createdAt) {
    throw new ProviderError(
      "Couldn't load the automation's activity. An entry in the response was incomplete."
    )
  }

  return {
    id: log.id,
    commenterUsername: log.commenterUsername ?? null,
    commenterName: log.commenterName ?? null,
    commentText: log.commentText ?? null,
    dmStatus: log.status,
    dmError: log.error ?? null,
    commentReplyStatus: log.commentReplyStatus ?? null,
    linkClicks: log.clickCount ?? null,
    occurredAt: log.createdAt,
  }
}
