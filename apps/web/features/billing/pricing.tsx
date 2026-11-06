"use client"

import { useState } from "react"
import Link from "next/link"
import {
  billingPath,
  TRIAL_DAYS,
  type BillingInterval,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { planCardsStyle } from "@/features/marketing/plans"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  accentButton,
  outlineButton,
} from "@/features/marketing/shell"
import { BillingIntervalToggle, PlanCards, PricingTerms } from "./plan-cards"

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  return (
    <MarketingPage>
      <PageIntro
        category="Pricing"
        title="Simple, flat pricing"
        description={`Pay per social set: one account on each of six platforms. Every plan includes Instagram DM automation, analytics and API access. No caps on DMs. Try any plan free for ${TRIAL_DAYS} days.`}
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:px-12">
        <BillingIntervalToggle
          value={interval}
          onChange={setInterval}
          className="justify-self-start rounded-full bg-white p-1 [&>button]:rounded-full"
        />
        <PlanCards
          currency="USD"
          interval={interval}
          trial
          className={planCardsStyle}
          action={(plan) => (
            <Link
              href={billingPath({ plan: plan.id, interval })}
              className={cn(
                plan.id === "growth" ? accentButton : outlineButton,
                "w-full"
              )}
            >
              Try {plan.name} free
            </Link>
          )}
        />
        <div>
          <PricingTerms />
        </div>
      </div>
      <MarketingCta />
    </MarketingPage>
  )
}
