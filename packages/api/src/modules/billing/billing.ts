import {
  isEntitled,
  type BillingCurrency,
  type BillingInterval,
  type PlanId,
  type SubscriptionStatus,
  type ChoosePlanInput,
} from "../../contract/billing"

/** A subscription as the payment provider reports it, mapped onto the plans. */
export type SubscriptionSnapshot = {
  providerSubscriptionId: string
  providerCustomerId: string
  plan: PlanId
  interval: BillingInterval
  status: SubscriptionStatus
  currency: BillingCurrency
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  /** When the provider created the subscription. */
  createdAt: string
}

/** A workspace's customer at the payment provider and its current subscription. */
export type BillingRecord = {
  workspaceId: string
  providerCustomerId: string
  subscription: SubscriptionSnapshot | null
  checkout: ReservedCheckout | null
}

export type CheckoutSession = { providerSessionId: string; url: string }

/** A reservation with no session means creation needs operator reconciliation. */
type ReservedCheckout = ChoosePlanInput & {
  requestedAt: string
  session: CheckoutSession | null
}

export type CheckoutStatus = {
  createdAt: string
  payment: "unpaid" | "pending" | "succeeded" | "failed" | "cancelled"
}

/**
 * Whether `candidate` should replace `current` as the workspace's subscription.
 * A customer can hold several, for example an expired one and its successor:
 * one that grants the plan wins, then the newer one.
 */
export function supersedes(
  candidate: SubscriptionSnapshot,
  current: SubscriptionSnapshot
): boolean {
  const entitled = isEntitled(candidate.status)
  if (entitled !== isEntitled(current.status)) return entitled
  return Date.parse(candidate.createdAt) > Date.parse(current.createdAt)
}
