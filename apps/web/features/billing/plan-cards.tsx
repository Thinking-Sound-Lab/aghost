import type { ReactNode } from "react"
import { Check } from "lucide-react"
import {
  BILLING_INTERVALS,
  PLAN_IDS,
  PLANS,
  socialSetCount,
  TRIAL_DAYS,
  type BillingCurrency,
  type BillingInterval,
  type Plan,
  type PlanId,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"

export function price(amount: number, currency: BillingCurrency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

/** The smallest yearly discount across plans, rounded down to a whole percent. */
const yearlySaving = Math.min(
  ...PLAN_IDS.map((id) => {
    const { monthly, yearly } = PLANS[id].prices.USD
    return Math.floor((1 - yearly / (monthly * 12)) * 100)
  })
)

export function BillingIntervalToggle({
  value,
  onChange,
  className,
}: {
  value: BillingInterval
  onChange: (interval: BillingInterval) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex justify-self-start rounded-lg border p-1",
        className
      )}
      role="group"
      aria-label="Billing interval"
    >
      {BILLING_INTERVALS.map((interval) => (
        <button
          key={interval}
          type="button"
          aria-pressed={value === interval}
          onClick={() => onChange(interval)}
          className={cn(
            "rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            value === interval && "bg-muted font-medium text-foreground"
          )}
        >
          {interval === "monthly" ? (
            "Monthly"
          ) : (
            <>
              Yearly{" "}
              {yearlySaving > 0 && (
                <span className="inline-block rounded-full bg-brand/15 px-1.5 py-0.5 text-xs leading-4 font-medium text-foreground">
                  Save {yearlySaving}%
                </span>
              )}
            </>
          )}
        </button>
      ))}
    </div>
  )
}

const descriptions: Record<PlanId, string> = {
  pro: "Turn interested comments into conversations.",
  growth: "Turn your DMs into a product showcase.",
  business: "Run up to ten brands, and bring people back to your offer.",
}

const purposes: Record<PlanId, string> = {
  pro: "Start the conversation",
  growth: "Showcase your products",
  business: "Grow every brand",
}

function benefits(plan: Plan): string[] {
  const accounts = `${socialSetCount(plan.socialSets)}: one account on each platform`
  if (plan.features.followUpNudge)
    return [
      "Everything in Growth",
      accounts,
      "Automatic follow-up nudges",
      "Choose a delay from 30 minutes to 20 hours",
      "Reminders stop after a reply or link click",
      "Send your offer link again",
    ]
  if (plan.features.productCarousel)
    return [
      "Everything in Pro",
      accounts,
      "Product carousels in your DMs",
      "Up to 10 swipeable product cards",
      "Images, descriptions and a link per product",
      "Click tracking on product links",
    ]
  return [
    accounts,
    "Instagram, Facebook, LinkedIn, X, Threads, YouTube and TikTok",
    "Scheduling and cross-posting",
    "Analytics for every channel",
    "Unlimited automations, contacts and DMs",
    "Post and reel comment triggers",
    "Keyword or any-comment matching",
    "Public comment replies",
    "Opening DMs and follower gates",
    "Up to 3 link buttons per DM",
    "Link clicks and delivery activity",
    "Instagram inbox",
    "MCP and REST API access",
  ]
}

function terms(interval: BillingInterval, trial: boolean): string {
  const billed = interval === "yearly" ? "billed yearly" : "billed monthly"
  if (trial) return `${TRIAL_DAYS} days free, then ${billed}. Taxes included`
  return interval === "yearly"
    ? "Taxes included, billed yearly"
    : "Taxes included"
}

export function PlanCards({
  currency,
  interval,
  trial,
  planHeading: PlanHeading = "h2",
  action,
  className,
}: {
  currency: BillingCurrency
  interval: BillingInterval
  /** Whether choosing a plan starts with the free trial. */
  trial: boolean
  /** h3 where the cards sit under a section's own h2. */
  planHeading?: "h2" | "h3"
  action: (plan: Plan) => ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-3", className)}>
      {PLAN_IDS.map((id) => {
        const plan = PLANS[id]
        return (
          <section
            key={id}
            className={cn(
              "plan-card flex min-w-0 flex-col rounded-2xl border p-6",
              id === "growth" && "border-brand bg-brand/5"
            )}
          >
            <p className="plan-card-purpose mb-4 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              {purposes[id]}
              {id === "growth" && (
                <span className="-my-0.5 rounded-full bg-brand/15 px-2 py-0.5 text-foreground">
                  Recommended
                </span>
              )}
            </p>
            <PlanHeading className="text-lg font-semibold">
              {plan.name}
            </PlanHeading>
            <p className="mt-1 min-h-10 text-sm text-muted-foreground">
              {descriptions[id]}
            </p>
            <p className="plan-card-price mt-6 flex flex-wrap items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {price(plan.prices[currency][interval], currency)}
              </span>
              <span className="text-sm text-muted-foreground">
                /{interval === "monthly" ? "month" : "year"}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {terms(interval, trial)}
            </p>
            <div className="plan-card-action mt-6">{action(plan)}</div>
            <ul className="mt-6 grid content-start gap-3 border-t pt-6 text-sm">
              {benefits(plan).map((feature, index) => (
                <li key={feature} className="flex gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <span
                    className={
                      index === 0 || (id !== "pro" && index === 2)
                        ? "font-semibold"
                        : undefined
                    }
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            {id !== "pro" && (
              <p className="mt-auto pt-6 text-xs text-muted-foreground">
                Unlimited automations, contacts and DMs. Scheduling, MCP and
                REST API included.
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}

export function PricingTerms() {
  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      <p>
        Instagram scheduling, MCP, REST API and dashboard access on every plan.
        Contacts and DMs never change your price. Instagram's publishing and
        messaging limits and fair use apply.
      </p>
      <p>
        New workspaces get a {TRIAL_DAYS}-day free trial of any plan. Your card
        is charged when it ends unless you cancel first.
      </p>
      <p>All plans are billed in US dollars. Taxes are included.</p>
    </div>
  )
}
