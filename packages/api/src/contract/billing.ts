import { z } from "zod"

export const PLAN_IDS = ["pro", "growth", "business"] as const
export const BILLING_INTERVALS = ["monthly", "yearly"] as const
export const BILLING_CURRENCIES = ["USD"] as const

export type PlanId = (typeof PLAN_IDS)[number]
export type BillingInterval = (typeof BILLING_INTERVALS)[number]
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number]

type PlanPrices = Record<BillingCurrency, Record<BillingInterval, number>>

export type Plan = {
  id: PlanId
  name: string
  instagramAccounts: number
  /** Tax-inclusive, in US cents. */
  prices: PlanPrices
}

/**
 * Every plan is a flat US dollar price, in every country.
 * Yearly billing costs twelve months, paid upfront.
 */
export const PLANS: Record<PlanId, Plan> = {
  pro: {
    id: "pro",
    name: "Pro",
    instagramAccounts: 1,
    prices: {
      USD: { monthly: 900, yearly: 10_800 },
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    instagramAccounts: 2,
    prices: {
      USD: { monthly: 1_900, yearly: 22_800 },
    },
  },
  business: {
    id: "business",
    name: "Business",
    instagramAccounts: 5,
    prices: {
      USD: { monthly: 4_900, yearly: 58_800 },
    },
  },
}

export const SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "past_due",
  "on_hold",
  "paused",
  "cancelled",
  "failed",
  "expired",
] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/**
 * A past-due subscription is in the payment provider's grace period, which ends
 * on hold or cancelled, so the plan keeps working until then.
 */
const ENTITLED_STATUSES: readonly SubscriptionStatus[] = ["active", "past_due"]

export function isEntitled(status: SubscriptionStatus): boolean {
  return ENTITLED_STATUSES.includes(status)
}

type Subscription = {
  plan: PlanId
  interval: BillingInterval
  status: SubscriptionStatus
  currency: BillingCurrency
  /** When the plan renews or, once cancelled, ends. */
  currentPeriodEnd: string
  /** The plan ends at `currentPeriodEnd` instead of renewing. */
  cancelAtPeriodEnd: boolean
}

export type BillingState = {
  /** The workspace being billed, known to the browser even before a plan. */
  workspaceId: string
  /** Plans are shown and charged in US dollars. */
  currency: BillingCurrency
  /** The workspace's most recent subscription, which may have ended. */
  subscription: Subscription | null
  /** Instagram accounts connected now, counted against the plan. */
  connectedAccounts: number
}

export const choosePlanSchema = z.object({
  plan: z.enum(PLAN_IDS),
  interval: z.enum(BILLING_INTERVALS),
})

export type ChoosePlanInput = z.infer<typeof choosePlanSchema>

/** Invalid or incomplete URL selections are ignored, never trusted as payment state. */
export function billingChoice(query: {
  plan?: unknown
  interval?: unknown
}): ChoosePlanInput | null {
  const parsed = choosePlanSchema.safeParse(query)
  return parsed.success ? parsed.data : null
}

export function billingPath(choice: ChoosePlanInput | null = null): string {
  return `/settings${choice ? `?${new URLSearchParams(choice)}` : ""}#billing`
}

export function billingLoginPath(
  choice: ChoosePlanInput | null = null
): string {
  return `/login?${new URLSearchParams({ next: "billing", ...choice })}`
}

/** A page on the payment provider's site to send the browser to. */
export type BillingRedirect = { url: string }

/** A plan change may need the customer to approve a payment first. */
export type PlanChangeResult = {
  state: BillingState
  paymentUrl: string | null
}
