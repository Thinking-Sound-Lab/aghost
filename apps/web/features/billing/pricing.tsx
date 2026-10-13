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
        description="Pick how many Instagram accounts you need. Every plan includes MCP and REST API access. More contacts and DMs never raise your price."
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8">
        <BillingIntervalToggle
          value={interval}
          onChange={setInterval}
          className="justify-self-center rounded-full border-white/15 [&>button]:rounded-full"
        />
        <PlanCards
          currency="USD"
          interval={interval}
          className="[&>section]:rounded-[2rem] [&>section]:bg-[#161616] [&>section]:p-8"
          action={(plan) => (
            <Link
              href={billingPath({ plan: plan.id, interval })}
              className={`${primaryButton} w-full`}
            >
              Choose {plan.name}
            </Link>
          )}
        />
        <div className="text-center">
          <PricingTerms />
        </div>
      </div>
      <MarketingCta />
    </MarketingPage>
  )
}
