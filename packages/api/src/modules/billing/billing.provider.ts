import type { BillingInterval, PlanId } from "../../contract/billing"
import type { SubscriptionSnapshot } from "./billing"

export type NewCustomer = {
  workspaceId: string
  email: string
  name: string
}

export type CheckoutRequest = {
  providerCustomerId: string
  plan: PlanId
  interval: BillingInterval
  returnUrl: string
  cancelUrl: string
}

/** The payment provider: it sells the plans and bills for them. */
export interface BillingProvider {
  /** Creates the customer and returns the provider's id for it. */
  createCustomer(customer: NewCustomer): Promise<string>
  /** Returns the address of a hosted checkout for the plan. */
  createCheckout(request: CheckoutRequest): Promise<string>
  /** Null when the subscription is not for one of the plans. */
  getSubscription(
    providerSubscriptionId: string
  ): Promise<SubscriptionSnapshot | null>
  /** The customer's subscriptions to the plans. */
  listSubscriptions(providerCustomerId: string): Promise<SubscriptionSnapshot[]>
  /** Moves the subscription to another plan or interval, charging the difference now. */
  changePlan(
    providerSubscriptionId: string,
    plan: PlanId,
    interval: BillingInterval
  ): Promise<string | null>
  /** Returns the address of the customer's self-service billing page. */
  createPortalSession(
    providerCustomerId: string,
    returnUrl: string
  ): Promise<string>
}
