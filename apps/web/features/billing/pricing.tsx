"use client"

import { useState } from "react"
import Link from "next/link"
import { billingPath, type BillingInterval } from "@workspace/api/contract"
import {
  MarketingPage,
  PageIntro,
  marketingButton,
} from "@/features/marketing/shell"
import { BillingIntervalToggle, PlanCards, PricingTerms } from "./plan-cards"

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  return (
    <MarketingPage>
      <PageIntro
        category="Pricing"
        title="One little ghost. One flat price."
        description="Pick how many Instagram accounts you need. Every plan includes MCP and REST API access. More contacts and DMs don’t increase your price."
      />
      <div className="notebook-section notebook-pricing">
        <BillingIntervalToggle
          value={interval}
          onChange={setInterval}
          className="notebook-pricing-toggle"
        />
        <PlanCards
          currency="USD"
          interval={interval}
          className="notebook-plan-grid"
          action={(plan) => (
            <Link
              href={billingPath({ plan: plan.id, interval })}
              className={marketingButton}
            >
              Choose {plan.name}
            </Link>
          )}
        />
        <div className="notebook-pricing-terms">
          <PricingTerms />
        </div>
      </div>
    </MarketingPage>
  )
}
