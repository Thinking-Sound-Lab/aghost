"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import {
  isEntitled,
  PLANS,
  type SubscriptionStatus,
} from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import { ConfirmButton, ErrorBanner, Loading } from "@/components/interface"
import { useBillingStore } from "@/stores/billing-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { BillingIntervalToggle, PlanCards, PricingTerms } from "./plan-cards"

const statusLabels: Record<SubscriptionStatus, string> = {
  pending: "Payment processing",
  active: "Active",
  past_due: "Payment overdue",
  on_hold: "On hold",
  paused: "Paused",
  cancelled: "Cancelled",
  failed: "Payment failed",
  expired: "Expired",
}

export function Billing() {
  const store = useBillingStore()
  const configured = useWorkspaceStore(
    (state) => state.integration?.billingConfigured ?? false
  )
  const load = store.load
  useEffect(() => {
    void load(configured)
  }, [configured, load])
  const subscription = store.state?.subscription
  const active = subscription && isEntitled(subscription.status)
  const recover =
    subscription &&
    ["pending", "on_hold", "paused"].includes(subscription.status)
  const currentPlan = subscription ? PLANS[subscription.plan] : null
  return (
    <section className="grid gap-6" aria-label="Plan and billing">
      <ErrorBanner
        message={store.error}
        retry={() => void store.load(configured)}
      />
      {!configured && (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          Subscriptions are not available yet. You can compare plans below.
        </p>
      )}
      {store.loading && !store.state ? (
        <Loading />
      ) : (
        store.state && (
          <>
            <div className="flex flex-wrap items-start gap-4">
              <div className="mr-auto grid gap-1">
                <h2 className="text-lg font-semibold">
                  {currentPlan
                    ? `${currentPlan.name} plan`
                    : "Choose your plan"}
                </h2>
                {subscription ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {statusLabels[subscription.status]} ·{" "}
                      {subscription.interval === "monthly"
                        ? "Monthly"
                        : "Yearly"}
                    </p>
                    {active && (
                      <p className="text-sm text-muted-foreground">
                        {subscription.cancelAtPeriodEnd
                          ? "Access ends"
                          : "Renews"}{" "}
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                        }).format(new Date(subscription.currentPeriodEnd))}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {store.state.connectedAccounts} of{" "}
                      {currentPlan?.instagramAccounts} Instagram accounts
                      connected
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All features. No contact-based charges.
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh billing"
                disabled={store.loading || store.busy}
                onClick={() => void store.load(configured)}
              >
                <RefreshCw className={store.loading ? "animate-spin" : ""} />
              </Button>
              {subscription && (
                <Button
                  variant="secondary"
                  disabled={!configured || store.busy}
                  onClick={() => void store.portal()}
                >
                  Manage billing
                </Button>
              )}
            </div>
            {subscription?.status === "pending" && (
              <p className="text-sm text-muted-foreground">
                Access begins when your payment is confirmed. Refresh billing to
                check the payment.
              </p>
            )}
            {subscription?.status === "past_due" && (
              <p className="text-sm text-muted-foreground">
                Your payment needs attention. Access continues while payment
                retries run. Open Manage billing to update your payment method.
              </p>
            )}
            {subscription &&
              ["on_hold", "paused"].includes(subscription.status) && (
                <p className="text-sm text-muted-foreground">
                  Your automations are paused. Open Manage billing to restore
                  your subscription, then turn your automations back on.
                </p>
              )}
            {store.notice && (
              <p role="status" className="text-sm">
                {store.notice}
              </p>
            )}
            <BillingIntervalToggle
              value={store.interval}
              onChange={(interval) => useBillingStore.setState({ interval })}
            />
            {store.selectedPlan && (
              <p className="text-sm text-muted-foreground">
                {PLANS[store.selectedPlan].name} ·{" "}
                {store.interval === "yearly" ? "Yearly" : "Monthly"} selected
              </p>
            )}
            <PlanCards
              currency={store.state.currency}
              interval={store.interval}
              action={(plan) => {
                const current =
                  active &&
                  subscription.plan === plan.id &&
                  subscription.interval === store.interval
                const tooSmall =
                  store.state!.connectedAccounts > plan.instagramAccounts
                if (current)
                  return (
                    <Button className="w-full" variant="secondary" disabled>
                      Current plan
                    </Button>
                  )
                if (tooSmall)
                  return (
                    <p className="text-sm text-muted-foreground">
                      Disconnect accounts to choose {plan.name}.
                    </p>
                  )
                if (active)
                  return (
                    <ConfirmButton
                      title={`Change to ${plan.name}?`}
                      description={`Switch to ${store.interval === "monthly" ? "monthly" : "yearly"} billing. Any prorated amount is charged now. Your plan changes after payment is confirmed.`}
                      confirmLabel="Change plan"
                      busy={store.busy || !configured}
                      onConfirm={() => store.choose(plan.id)}
                    >
                      Change to {plan.name}
                    </ConfirmButton>
                  )
                return (
                  <Button
                    className="w-full"
                    variant={
                      plan.id === (store.selectedPlan ?? "growth")
                        ? "default"
                        : "secondary"
                    }
                    disabled={!configured || store.busy || Boolean(recover)}
                    onClick={() => void store.choose(plan.id)}
                  >
                    {plan.id === store.selectedPlan
                      ? "Continue with"
                      : "Choose"}{" "}
                    {plan.name}
                  </Button>
                )
              }}
            />
            <PricingTerms />
          </>
        )
      )}
    </section>
  )
}
