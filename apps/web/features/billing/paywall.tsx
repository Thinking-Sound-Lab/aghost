"use client"

import { useEffect } from "react"
import { billingChoice } from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import { Brand } from "@/components/brand"
import { ErrorBanner } from "@/components/interface"
import { useAuthStore } from "@/stores/auth-store"
import { useBillingStore } from "@/stores/billing-store"
import { Billing } from "./billing"

/** Stands in for the dashboard until the workspace has a plan. */
export function Paywall() {
  const auth = useAuthStore()
  const selectPlan = useBillingStore((state) => state.select)
  useEffect(() => {
    // The pricing page sends its plan and interval along in the address.
    const choice = billingChoice(
      Object.fromEntries(new URLSearchParams(window.location.search))
    )
    if (choice) selectPlan(choice)
  }, [selectPlan])
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-6">
      <header className="flex h-16 items-center gap-2">
        <Brand />
        <span className="ml-auto min-w-0 truncate text-sm text-muted-foreground">
          {auth.user?.email}
        </span>
        <Button variant="ghost" onClick={() => void auth.signOut()}>
          Log out
        </Button>
      </header>
      <main className="grid gap-6 py-10">
        <ErrorBanner message={auth.error} />
        <Billing />
      </main>
    </div>
  )
}
