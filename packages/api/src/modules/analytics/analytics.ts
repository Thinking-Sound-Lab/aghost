import type { ApiErrorCode } from "../../contract/errors"
import type {
  AutomationStatus,
  MatchMode,
  PostScope,
} from "../../contract/automation"
import type { Platform } from "../../contract/platform"
import type { PostKind } from "../../contract/post"
import type {
  BillingInterval,
  PlanId,
  SubscriptionStatus,
} from "../../contract/billing"
import type { WorkspaceOwner } from "../workspaces/workspace"

/** Where an action came from. */
export type EventSource =
  "dashboard" | "api" | "mcp" | "webhook" | "maintenance"

/** The person an event is about, and their workspace once it is known. */
export type Actor = { userId: string; workspaceId?: string }

/** A workspace has one owner, who acts for it, including through API keys. */
export function actorOf(workspace: WorkspaceOwner): Actor {
  return { userId: workspace.ownerId, workspaceId: workspace.id }
}

type None = Record<never, never>

type AutomationShape = {
  automation_id: string
  status: AutomationStatus
  post_scope: PostScope
  match_mode: MatchMode
  keyword_count: number
  has_opening_dm: boolean
  button_count: number
  has_comment_reply: boolean
  requires_follow: boolean
}

type PostShape = {
  post_id: string
  platform: Platform
  kind: PostKind
  media_count: number
  video_count: number
  has_caption: boolean
  has_automation: boolean
}

export type SubscriptionShape = {
  subscription_id: string
  plan: PlanId
  billing_interval: BillingInterval
  status: SubscriptionStatus
  /** The plan's list price for one billing period. */
  price_usd: number
  /**
   * Monthly recurring revenue at the plan's current list price: zero once the
   * plan has ended. A subscription kept on an older price after a catalog
   * change is still counted at the new one.
   */
  mrr_usd: number
}

type Events = {
  user_signed_up: { method: "google" }
  user_signed_in: { method: "google" }
  workspace_renamed: None
  api_key_created: { api_key_id: string; scope_count: number; expires: boolean }
  api_key_revoked: { api_key_id: string }
  /** One REST operation or MCP tool call by an agent. */
  agent_tool_called: {
    tool: string
    api_key_id: string
    outcome: "succeeded" | "failed"
    error_code: ApiErrorCode | null
    duration_ms: number
  }
  // Account events kept their names from when every account was on
  // Instagram; `platform` tells them apart.
  instagram_connect_started: { platform: Platform }
  /** The owner went to authorize an account again, to grant new permissions. */
  instagram_reconnect_started: { account_id: string; platform: Platform }
  instagram_account_connected: { account_id: string; platform: Platform }
  /**
   * The plan had no room for an account the owner tried to connect. The id is
   * null when the connection was refused before any account was authorized.
   */
  instagram_account_limit_reached: {
    account_id: string | null
    platform: Platform
  }
  instagram_account_disconnected: {
    account_id: string
    platform: Platform
    reason: string
  }
  instagram_account_removed: { account_id: string; platform: Platform }
  automation_created: AutomationShape
  automation_updated: AutomationShape
  automation_activated: { automation_id: string }
  automation_paused: { automation_id: string; reason: "owner" | "plan" }
  automation_deleted: {
    automation_id: string
    reason: "owner" | "account_removed" | "post_deleted"
  }
  post_scheduled: PostShape
  scheduled_post_updated: PostShape
  /** Seen the first time the post is read after its time. */
  scheduled_post_published: { post_id: string }
  /** The post did not publish, or the ended plan cancelled it. */
  scheduled_post_failed: { post_id: string; reason: "publishing" | "plan" }
  scheduled_post_deleted: {
    post_id: string
    reason: "owner" | "account_removed"
  }
  /** The owner uploaded files through a link an agent gave them. */
  upload_link_completed: {
    upload_link_id: string
    media_count: number
    video_count: number
  }
  inbox_message_sent: { account_id: string }
  checkout_started: {
    plan: PlanId
    billing_interval: BillingInterval
    price_usd: number
    /** The customer went back to an unpaid checkout they had started. */
    resumed: boolean
  }
  plan_change_requested: {
    plan: PlanId
    billing_interval: BillingInterval
    from_plan: PlanId
    from_billing_interval: BillingInterval
    payment_required: boolean
  }
  billing_portal_opened: None
  /** The workspace gained a plan, for the first time or again. */
  subscription_started: SubscriptionShape & {
    previous_status: SubscriptionStatus | null
  }
  subscription_renewed: SubscriptionShape
  subscription_plan_changed: SubscriptionShape & {
    from_plan: PlanId
    from_billing_interval: BillingInterval
    previous_mrr_usd: number
  }
  subscription_cancellation_scheduled: SubscriptionShape
  subscription_cancellation_withdrawn: SubscriptionShape
  /** The workspace lost its plan. */
  subscription_ended: SubscriptionShape & { previous_mrr_usd: number }
  /** A status change that neither starts nor ends the plan, such as past due. */
  subscription_status_changed: SubscriptionShape & {
    previous_status: SubscriptionStatus
  }
}

/** Every product event, named as it appears in PostHog. */
export type ProductEvent = {
  [Name in keyof Events]: { name: Name } & Events[Name]
}[keyof Events]

/** What is now true of a workspace. Each workspace has one owner, who gets the same traits. */
export type WorkspaceTraits = {
  workspace_name?: string
  plan?: PlanId
  billing_interval?: BillingInterval
  subscription_status?: SubscriptionStatus
  mrr_usd?: number
  cancel_at_period_end?: boolean
}

export type PersonTraits = {
  email?: string
  name?: string
  signed_up_at: string
}

/** Records what happens through one source. Delivery never fails the caller. */
export interface ProductAnalytics {
  capture(actor: Actor, event: ProductEvent): void
  describeWorkspace(workspace: WorkspaceOwner, traits: WorkspaceTraits): void
  /** An error that no one expected, for error tracking. */
  captureException(
    error: unknown,
    actor: Actor | null,
    context: Record<string, string>
  ): void
}

export interface Analytics {
  from(source: EventSource): ProductAnalytics
  identify(userId: string, traits: PersonTraits): void
  /** Called when events cannot be delivered. */
  reportFailuresTo(report: (error: unknown) => void): void
  /** Sends the events still queued. Call it once, as the process stops. */
  shutdown(): Promise<void>
}

const disabled: ProductAnalytics = {
  capture: () => {},
  describeWorkspace: () => {},
  captureException: () => {},
}

/** Analytics is off when no PostHog project is configured: nothing is recorded. */
export const DISABLED_ANALYTICS: Analytics = {
  from: () => disabled,
  identify: () => {},
  reportFailuresTo: () => {},
  shutdown: async () => {},
}
