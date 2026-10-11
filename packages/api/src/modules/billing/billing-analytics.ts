import {
  isEntitled,
  PLANS,
  type BillingInterval,
  type PlanId,
} from "../../contract/billing"
import type {
  ProductEvent,
  SubscriptionShape,
  WorkspaceTraits,
} from "../analytics/analytics"
import type { SubscriptionSnapshot } from "./billing"

/** The plan's list price for one billing period, in US dollars. */
export function priceUsd(plan: PlanId, interval: BillingInterval): number {
  return PLANS[plan].prices.USD[interval] / 100
}

/**
 * Monthly recurring revenue in US dollars at the plan's list price: zero
 * without a working plan. Stored subscriptions do not keep their own price.
 */
function mrrUsd(subscription: SubscriptionSnapshot): number {
  if (!isEntitled(subscription.status)) return 0
  const price = priceUsd(subscription.plan, subscription.interval)
  const monthly = subscription.interval === "yearly" ? price / 12 : price
  return Math.round(monthly * 100) / 100
}

function shapeOf(subscription: SubscriptionSnapshot): SubscriptionShape {
  return {
    subscription_id: subscription.providerSubscriptionId,
    plan: subscription.plan,
    billing_interval: subscription.interval,
    status: subscription.status,
    price_usd: priceUsd(subscription.plan, subscription.interval),
    mrr_usd: mrrUsd(subscription),
  }
}

/**
 * What changed between the workspace's stored subscription and the one that
 * replaces it. A plan starts or ends when the workspace gains or loses its
 * entitlement; every other status change is reported as such.
 */
export function subscriptionEvents(
  previous: SubscriptionSnapshot | null,
  current: SubscriptionSnapshot
): ProductEvent[] {
  const shape = shapeOf(current)
  const was = previous !== null && isEntitled(previous.status)
  const is = isEntitled(current.status)

  if (!was && is)
    return [
      {
        name: "subscription_started",
        ...shape,
        previous_status: previous?.status ?? null,
      },
    ]
  if (!previous) return []
  if (was && !is)
    return [
      {
        name: "subscription_ended",
        ...shape,
        previous_mrr_usd: mrrUsd(previous),
      },
    ]

  const events: ProductEvent[] = []
  if (previous.status !== current.status)
    events.push({
      name: "subscription_status_changed",
      ...shape,
      previous_status: previous.status,
    })
  if (!is) return events

  if (previous.plan !== current.plan || previous.interval !== current.interval)
    events.push({
      name: "subscription_plan_changed",
      ...shape,
      from_plan: previous.plan,
      from_billing_interval: previous.interval,
      previous_mrr_usd: mrrUsd(previous),
    })
  else if (
    previous.providerSubscriptionId === current.providerSubscriptionId &&
    Date.parse(current.currentPeriodEnd) > Date.parse(previous.currentPeriodEnd)
  )
    events.push({ name: "subscription_renewed", ...shape })

  if (!previous.cancelAtPeriodEnd && current.cancelAtPeriodEnd)
    events.push({ name: "subscription_cancellation_scheduled", ...shape })
  if (previous.cancelAtPeriodEnd && !current.cancelAtPeriodEnd)
    events.push({ name: "subscription_cancellation_withdrawn", ...shape })

  return events
}

/** The workspace's plan as person and group properties, for breakdowns. */
export function subscriptionTraits(
  subscription: SubscriptionSnapshot
): WorkspaceTraits {
  return {
    plan: subscription.plan,
    billing_interval: subscription.interval,
    subscription_status: subscription.status,
    mrr_usd: mrrUsd(subscription),
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
  }
}
