"use client"

import { useState } from "react"
import Link from "next/link"
import { billingPath, type BillingInterval } from "@workspace/api/contract"
import { buttonVariants } from "@workspace/ui/components/button"
import { Brand } from "@/components/brand"
import { BillingIntervalToggle, PlanCards, PricingTerms } from "./plan-cards"

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-6">
      <header className="flex h-16 items-center gap-2">
        <Brand />
        <Link
          href="/login"
          className={buttonVariants({ variant: "ghost", className: "ml-auto" })}
        >
          Log in
        </Link>
        <Link href="/login" className={buttonVariants()}>
          Get started
        </Link>
      </header>
      <main className="grid gap-8 py-14">
        <div className="grid max-w-xl gap-4">
          <p className="text-sm font-medium">MCP + REST API on every plan</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Agent-first automation.
            <br />
            One flat price.
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect your AI agent through MCP or automate with the REST API.
            Choose how many Instagram accounts you need. Contacts and DMs never
            increase your price.
          </p>
        </div>
        <BillingIntervalToggle value={interval} onChange={setInterval} />
        <PlanCards
          currency="USD"
          interval={interval}
          action={(plan) => (
            <Link
              href={billingPath({ plan: plan.id, interval })}
              className={buttonVariants({
                variant: plan.id === "growth" ? "default" : "secondary",
                className: "w-full",
              })}
            >
              Choose {plan.name}
            </Link>
          )}
        />
        <PricingTerms />
      </main>
    </div>
  )
}
