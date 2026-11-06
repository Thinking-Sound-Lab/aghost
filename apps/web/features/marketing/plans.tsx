"use client"

import { useState } from "react"
import Link from "next/link"
import { billingPath, type BillingInterval } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import {
  BillingIntervalToggle,
  PlanCards,
  PricingTerms,
} from "@/features/billing/plan-cards"
import { accentButton, outlineButton } from "./shell"

/** The plans as white cards, the way the home page and pricing page show them. */
export const planCardsStyle =
  "gap-3 [&>section]:rounded-[24px] [&>section]:bg-white [&>section]:p-8 [&>section]:shadow-[0_0_0_1px_rgb(18_20_22/0.04),0_1px_2px_rgb(18_20_22/0.03),0_30px_60px_-40px_rgb(17_24_39/0.25)]"

/** Plan cards with a monthly and yearly switch. */
export function LandingPlans() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  return (
    <div className="mx-auto mt-12 grid max-w-[70rem] gap-8">
      <BillingIntervalToggle
        value={interval}
        onChange={setInterval}
        className="justify-self-center rounded-full bg-white p-1 [&>button]:rounded-full"
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
      <div className="text-center">
        <PricingTerms />
      </div>
    </div>
  )
}
