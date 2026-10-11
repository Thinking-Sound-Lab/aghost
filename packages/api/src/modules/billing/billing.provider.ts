import type { BillingInterval, PlanId } from "../../contract/billing"
import type {
  CheckoutSession,
  CheckoutStatus,
  SubscriptionSnapshot,
} from "./billing"

export type NewCustomer = {
  workspaceId: string
  email: string
  name: string
}

export type CheckoutRequest = {
  providerCustomerId: string
  plan: PlanId
  interval: BillingInterval
  providerProductId: string
  returnUrl: string
  cancelUrl: string
}

/** The payment provider: it sells the plans and bills for them. */
export interface BillingProvider {
  /** Creates the customer and returns the provider's id for it. */
  createCustomer(customer: NewCustomer): Promise<string>
  /** Validates the sales catalog and price before reserving a checkout. */
  prepareCheckout(plan: PlanId, interval: BillingInterval): Promise<string>
  /** Creates a single-use hosted checkout from a validated product. */
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>
  getCheckout(providerSessionId: string): Promise<CheckoutStatus>
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
