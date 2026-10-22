import { z } from "zod"

export const PLAN_IDS = ["pro", "growth", "business", "ultimate"] as const
export const BILLING_INTERVALS = ["monthly", "yearly"] as const
export const BILLING_CURRENCIES = ["USD"] as const

export type PlanId = (typeof PLAN_IDS)[number]
export type BillingInterval = (typeof BILLING_INTERVALS)[number]
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number]

type PlanPrices = Record<BillingCurrency, Record<BillingInterval, number>>

export type Plan = {
  id: PlanId
  name: string
  /** Connected accounts on any platform, counted together. */
  channels: number
  features: { productCarousel: boolean; followUpNudge: boolean }
  /** Tax-inclusive, in US cents. */
  prices: PlanPrices
}

/**
 * Every plan is a flat US dollar price, in every country, following Postiz's
 * channel pricing. Yearly billing is about 20% less, paid upfront.
 */
export const PLANS: Record<PlanId, Plan> = {
  pro: {
    id: "pro",
    name: "Pro",
    channels: 5,
    features: { productCarousel: false, followUpNudge: false },
    prices: {
      USD: { monthly: 2_900, yearly: 27_600 },
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    channels: 10,
    features: { productCarousel: true, followUpNudge: false },
    prices: {
      USD: { monthly: 3_900, yearly: 37_200 },
    },
  },
  business: {
    id: "business",
    name: "Business",
    channels: 30,
    features: { productCarousel: true, followUpNudge: true },
    prices: {
      USD: { monthly: 4_900, yearly: 46_800 },
    },
  },
  ultimate: {
    id: "ultimate",
    name: "Ultimate",
    channels: 100,
    features: { productCarousel: true, followUpNudge: true },
    prices: {
      USD: { monthly: 9_900, yearly: 94_800 },
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
  /** Accounts connected now on every platform, counted against the plan. */
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
