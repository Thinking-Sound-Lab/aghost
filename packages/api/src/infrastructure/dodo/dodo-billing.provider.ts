import type DodoPayments from "dodopayments"
import { NotFoundError } from "dodopayments"

import {
  BILLING_CURRENCIES,
  PLANS,
  isEntitled,
  type BillingInterval,
  type PlanId,
} from "../../contract/billing"
import type {
  CheckoutSession,
  CheckoutStatus,
  SubscriptionSnapshot,
} from "../../modules/billing/billing"
import type {
  BillingProvider,
  CheckoutRequest,
  NewCustomer,
} from "../../modules/billing/billing.provider"
import { InternalError, ProviderError } from "../../shared/errors"
import {
  DodoCatalog,
  catalogEntry,
  loadCatalog,
  type CatalogEntry,
} from "./dodo-catalog"
import { request, type DodoAccess } from "./dodo-client"

type DodoSubscription = Pick<
  DodoPayments.Subscription,
  | "subscription_id"
  | "customer"
  | "product_id"
  | "status"
  | "currency"
  | "next_billing_date"
  | "cancel_at_next_billing_date"
  | "created_at"
>

export class DodoBillingProvider implements BillingProvider {
  private catalog: Promise<DodoCatalog> | null = null
  private readonly subscriptionProducts = new Map<
    string,
    Promise<CatalogEntry | null>
  >()

  constructor(private readonly dodo: DodoAccess) {}

  async createCustomer(customer: NewCustomer): Promise<string> {
    const created = await request("create the billing customer", () =>
      this.dodo().customers.create({
        email: customer.email,
        name: customer.name,
        metadata: { aghost_workspace_id: customer.workspaceId },
      })
    )
    return created.customer_id
  }

  async prepareCheckout(
    plan: PlanId,
    interval: BillingInterval
  ): Promise<string> {
    const catalog = await this.loadCatalog()
    const productId = catalog.productId(plan, interval)
    // Account-wide Charm Pricing can change even USD base prices. Check the
    // provider's quote before offering checkout at the advertised amount.
    const quote = await request("check the checkout price", () =>
      this.dodo().checkoutSessions.preview({
        product_cart: [{ product_id: productId, quantity: 1 }],
        billing_currency: "USD",
        feature_flags: { allow_currency_selection: false },
        billing_address: { country: "US" },
      })
    )
    const expected = PLANS[plan].prices.USD[interval]
    if (
      quote.currency !== "USD" ||
      quote.current_breakup.total_amount !== expected ||
      quote.recurring_breakup?.total_amount !== expected
    ) {
      throw new InternalError(
        "Dodo's checkout quote differs from the advertised USD price. Check this business's Charm Pricing settings."
      )
    }
    return productId
  }

  async createCheckout(checkout: CheckoutRequest): Promise<CheckoutSession> {
    const session = await request("start checkout", () =>
      this.dodo().checkoutSessions.create(
        {
          product_cart: [
            {
              product_id: checkout.providerProductId,
              quantity: 1,
            },
          ],
          customer: { customer_id: checkout.providerCustomerId },
          // Bill the USD base price in every country and prevent the customer
          // from switching currencies through Adaptive Currency.
          billing_currency: "USD",
          feature_flags: { allow_currency_selection: false },
          return_url: checkout.returnUrl,
          cancel_url: checkout.cancelUrl,
        },
        { maxRetries: 0 }
      )
    )

    if (!session.checkout_url || !session.session_id) {
      throw new ProviderError(
        "Couldn't start checkout. Dodo Payments returned no checkout page."
      )
    }

    return { providerSessionId: session.session_id, url: session.checkout_url }
  }

  async getCheckout(providerSessionId: string): Promise<CheckoutStatus> {
    const session = await request("check the checkout", () =>
      this.dodo().checkoutSessions.retrieve(providerSessionId)
    )
    const status = session.payment_status
    return {
      createdAt: session.created_at,
      payment:
        !session.payment_id && !status
          ? "unpaid"
          : status === "succeeded" ||
              status === "failed" ||
              status === "cancelled"
            ? status
            : "pending",
    }
  }

  async getSubscription(
    providerSubscriptionId: string
  ): Promise<SubscriptionSnapshot | null> {
    const subscription = await request("load the subscription", async () => {
      try {
        return await this.dodo().subscriptions.retrieve(providerSubscriptionId)
      } catch (error) {
        // Dashboard test events name subscriptions that do not exist.
        if (error instanceof NotFoundError) return null
        throw error
      }
    })

    if (!subscription) return null
    return this.paidSnapshot(subscription)
  }

  async listSubscriptions(
    providerCustomerId: string
  ): Promise<SubscriptionSnapshot[]> {
    const snapshots: SubscriptionSnapshot[] = []

    await request("list the subscriptions", async () => {
      for await (const subscription of this.dodo().subscriptions.list({
        customer_id: providerCustomerId,
      })) {
        const snapshot = await this.paidSnapshot(subscription)
        if (snapshot) snapshots.push(snapshot)
      }
    })

    return snapshots
  }

  async changePlan(
    providerSubscriptionId: string,
    plan: PlanId,
    interval: BillingInterval
  ): Promise<string | null> {
    const catalog = await this.loadCatalog()
    const changed = await request("change the plan", () =>
      this.dodo().subscriptions.changePlan(providerSubscriptionId, {
        product_id: catalog.productId(plan, interval),
        quantity: 1,
        proration_billing_mode: "prorated_immediately",
        // A declined charge leaves the subscription on the plan it had.
        on_payment_failure: "prevent_change",
      })
    )
    return changed.payment_link ?? null
  }

  private async paidSnapshot(
    subscription: DodoSubscription
  ): Promise<SubscriptionSnapshot | null> {
    const entry = await this.subscriptionProduct(subscription.product_id)
    const snapshot = entry && toSnapshot(entry, subscription)
    if (!snapshot || !isEntitled(snapshot.status)) return snapshot

    // Active can mean only that a payment authorization was completed. The
    // first debit can still be processing. Require a successful payment from
    // Dodo's API before granting initial access; later renewals keep the
    // provider's grace period until it puts the subscription on hold.
    const paid = await request("confirm the subscription payment", async () => {
      for await (const payment of this.dodo().payments.list({
        subscription_id: subscription.subscription_id,
        status: "succeeded",
      })) {
        if (
          payment.status === "succeeded" &&
          payment.total_amount > 0 &&
          payment.customer.customer_id === snapshot.providerCustomerId &&
          payment.currency === snapshot.currency &&
          (payment.subscription_id === snapshot.providerSubscriptionId ||
            payment.subscription_ids.includes(snapshot.providerSubscriptionId))
        )
          return true
      }
      return false
    })
    return paid ? snapshot : { ...snapshot, status: "pending" }
  }

  /** Existing contracts remain readable even if their SKU is archived or repriced. */
  private subscriptionProduct(productId: string): Promise<CatalogEntry | null> {
    const existing = this.subscriptionProducts.get(productId)
    if (existing) return existing
    const loading = request("identify the subscription product", async () =>
      catalogEntry(await this.dodo().products.retrieve(productId))
    )
    this.subscriptionProducts.set(productId, loading)
    loading.catch(() => this.subscriptionProducts.delete(productId))
    return loading
  }

  async createPortalSession(
    providerCustomerId: string,
    returnUrl: string
  ): Promise<string> {
    const session = await request("open billing", () =>
      this.dodo().customers.customerPortal.create(providerCustomerId, {
        return_url: returnUrl,
      })
    )
    return session.link
  }

  /**
   * Products change only through the setup command, so they are checked once
   * per process. A check that fails is tried again on the next request.
   */
  private loadCatalog(): Promise<DodoCatalog> {
    if (!this.catalog) {
      const loading = loadCatalog(this.dodo())
      this.catalog = loading
      loading.catch(() => {
        if (this.catalog === loading) this.catalog = null
      })
    }
    return this.catalog
  }
}

function toSnapshot(
  entry: CatalogEntry,
  subscription: DodoSubscription
): SubscriptionSnapshot | null {
  const currency = BILLING_CURRENCIES.find(
    (code) => code === subscription.currency
  )
  if (!currency) {
    throw new InternalError(
      `Subscription ${subscription.subscription_id} bills in ${subscription.currency}, which no plan is priced in.`
    )
  }

  return {
    providerSubscriptionId: subscription.subscription_id,
    providerCustomerId: subscription.customer.customer_id,
    plan: entry.plan,
    interval: entry.interval,
    status: subscription.status,
    currency,
    currentPeriodEnd: subscription.next_billing_date,
    cancelAtPeriodEnd: subscription.cancel_at_next_billing_date,
    createdAt: subscription.created_at,
  }
}
