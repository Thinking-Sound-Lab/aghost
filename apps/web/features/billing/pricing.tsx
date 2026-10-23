"use client"

import { useState } from "react"
import Link from "next/link"
import { billingPath, type BillingInterval } from "@workspace/api/contract"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  primaryButton,
} from "@/features/marketing/shell"
import { BillingIntervalToggle, PlanCards, PricingTerms } from "./plan-cards"

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  return (
    <MarketingPage>
      <PageIntro
        category="Pricing"
        title="Simple, flat pricing"
        description="Pay per channel. Every plan includes six platforms, Instagram DM automation, analytics and API access. No caps on DMs."
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:px-12">
        <BillingIntervalToggle
          value={interval}
          onChange={setInterval}
          className="justify-self-start"
        />
        <PlanCards
          currency="USD"
          interval={interval}
          className="gap-0 border-t border-l border-ink/10 [&>section]:rounded-none [&>section]:border-0 [&>section]:border-r [&>section]:border-b [&>section]:border-ink/10 [&>section]:bg-white/50 [&>section]:p-8"
          action={(plan) => (
            <Link
              href={billingPath({ plan: plan.id, interval })}
              className={`${primaryButton} w-full`}
            >
              Choose {plan.name}
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
