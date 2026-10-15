import type { ReactNode } from "react"
import { Check } from "lucide-react"
import {
  BILLING_INTERVALS,
  PLAN_IDS,
  PLANS,
  type BillingCurrency,
  type BillingInterval,
  type Plan,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"

export function price(amount: number, currency: BillingCurrency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

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
          {interval === "monthly" ? "Monthly" : "Yearly"}
        </button>
      ))}
    </div>
  )
}

const descriptions = {
  pro: "For your creator account.",
  growth: "For a creator and a brand.",
  business: "For brands managing several accounts.",
}

export function PlanCards({
  currency,
  interval,
  action,
  className,
}: {
  currency: BillingCurrency
  interval: BillingInterval
  action: (plan: Plan) => ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {PLAN_IDS.map((id) => {
        const plan = PLANS[id]
        return (
          <section
            key={id}
            className="flex min-w-0 flex-col rounded-lg border p-6"
          >
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="mt-1 min-h-10 text-sm text-muted-foreground">
              {descriptions[id]}
            </p>
            <p className="mt-6 flex flex-wrap items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {price(plan.prices[currency][interval], currency)}
              </span>
              <span className="text-sm text-muted-foreground">
                /{interval === "monthly" ? "month" : "year"}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Taxes included
              {interval === "yearly" && ", billed yearly"}
            </p>
            <p className="mt-6 text-sm font-semibold">
              {plan.instagramAccounts} Instagram account
              {plan.instagramAccounts > 1 ? "s" : ""}
            </p>
            <ul className="mt-4 grid gap-3 text-sm">
              {[
                "MCP access for AI agents",
                "REST API access",
                "Instagram post and story scheduling",
                "Unlimited automations",
                "Unlimited contacts and DMs",
                "Comment keywords and follow requirement",
                "Inbox and activity",
              ].map((feature, index) => (
                <li key={feature} className="flex gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <span className={index < 2 ? "font-medium" : undefined}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">{action(plan)}</div>
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
      <p>All plans are billed in US dollars. Taxes are included.</p>
    </div>
  )
}
