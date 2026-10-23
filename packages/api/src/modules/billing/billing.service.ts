import {
  isEntitled,
  PLANS,
  type BillingState,
  type ChoosePlanInput,
  type PlanChangeResult,
  type Plan,
} from "../../contract/billing"
import {
  BadRequestError,
  ConflictError,
  PlanLimitError,
  PlanRequiredError,
} from "../../shared/errors"
import { actorOf, type ProductAnalytics } from "../analytics/analytics"
import type { WorkspaceOwner, WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import { supersedes, type SubscriptionSnapshot } from "./billing"
import {
  priceUsd,
  subscriptionEvents,
  subscriptionTraits,
} from "./billing-analytics"
import type { BillingProvider } from "./billing.provider"
import type { BillingRepository } from "./billing.repository"
import { channelCount, type ConnectedAccounts } from "./plan-entitlements"

/** Stops the automations of a workspace whose plan has ended. */
export interface WorkspaceAutomations {
  pauseAll(workspace: WorkspaceOwner): Promise<void>
  pauseUnsupported(workspace: WorkspaceOwner, plan: Plan): Promise<void>
}

/** Cancels the posts of a workspace whose plan has ended. */
export interface WorkspacePosts {
  cancelAll(workspace: WorkspaceOwner): Promise<void>
}

/** The signed-in person paying for the workspace. */
export type Payer = { email: string; name: string }

/** Where the payment provider sends the browser back to. */
export type BillingPages = {
  checkoutReturn: string
  checkoutCancel: string
  portalReturn: string
}

export type WebhookOutcome = "processed" | "ignored"

export class BillingService {
  constructor(
    private readonly billing: BillingRepository,
    private readonly provider: BillingProvider,
    private readonly accounts: ConnectedAccounts,
    private readonly automations: WorkspaceAutomations,
    private readonly posts: WorkspacePosts,
    private readonly pages: BillingPages,
    private readonly operations: WorkspaceOperations,
    private readonly analytics: ProductAnalytics
  ) {}

  async getState(workspace: WorkspaceRecord): Promise<BillingState> {
    const [record, connectedAccounts] = await Promise.all([
      this.billing.findByWorkspace(workspace.id),
      this.accounts.countConnected(workspace.id),
    ])
    const snapshot = record?.subscription ?? null
    // Keeps the plan on the owner and workspace current, including for
    // subscriptions that began before analytics did.
    if (snapshot)
      this.analytics.describeWorkspace(workspace, subscriptionTraits(snapshot))

    return {
      workspaceId: workspace.id,
      currency: "USD",
      subscription: snapshot && {
        plan: snapshot.plan,
        interval: snapshot.interval,
        status: snapshot.status,
        currency: snapshot.currency,
        currentPeriodEnd: snapshot.currentPeriodEnd,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      },
      connectedAccounts,
    }
  }

  /** Returns the address of a checkout for the chosen plan. */
  async startCheckout(
    workspace: WorkspaceRecord,
    payer: Payer,
    choice: ChoosePlanInput
  ): Promise<string> {
    return this.operations.run(workspace.id, () =>
      this.checkout(workspace, payer, choice)
    )
  }

  private async checkout(
    workspace: WorkspaceRecord,
    payer: Payer,
    choice: ChoosePlanInput
  ): Promise<string> {
    let record = await this.billing.findByWorkspace(workspace.id)
    // A completed checkout may precede its webhook. Reconcile the customer's
    // subscriptions before letting them buy again.
    if (record) {
      await this.sync(workspace)
      record = await this.billing.findByWorkspace(workspace.id)
    }

    if (
      record?.subscription &&
      !["cancelled", "failed", "expired"].includes(record.subscription.status)
    ) {
      throw new ConflictError(
        "This workspace already has a subscription. Change its plan or open Manage billing."
      )
    }

    const providerCustomerId =
      record?.providerCustomerId ??
      (await this.createCustomer(workspace, payer))

    const checkout = record?.checkout
    if (checkout) {
      if (!checkout.session) {
        throw new ConflictError(
          "Your previous checkout is being reconciled. Contact support before starting another payment."
        )
      }
      const status = await this.provider.getCheckout(
        checkout.session.providerSessionId
      )
      // A payment begun on the link can remain unsettled long after it expires.
      if (
        status.payment === "pending" ||
        (status.payment === "succeeded" && !record?.subscription)
      ) {
        throw new ConflictError(
          "Your checkout payment is still being reconciled. Refresh billing before starting another payment."
        )
      }
      // Dodo's single-use, unconfirmed checkout links expire after 24 hours.
      // Use the provider's creation time, with a clock-skew allowance.
      const expired = Date.now() >= Date.parse(status.createdAt) + 86_460_000
      if (
        !expired &&
        status.payment === "unpaid" &&
        checkout.plan === choice.plan &&
        checkout.interval === choice.interval
      ) {
        this.recordCheckout(workspace, choice, true)
        return checkout.session.url
      }
    }

    const providerProductId = await this.provider.prepareCheckout(
      choice.plan,
      choice.interval
    )
    // The customer chose another plan, or the link can no longer be paid.
    // Dodo cannot revoke a link, so an unpaid one replaced here stays
    // payable until it expires. It is kept until its replacement is priced,
    // so a refused replacement leaves it resumable.
    if (checkout) await this.billing.clearCheckout(workspace.id)
    // Persist intent before the provider call. Never create again when a
    // previous request or database save has an uncertain outcome.
    await this.billing.reserveCheckout(workspace.id, choice)
    const session = await this.provider.createCheckout({
      providerCustomerId,
      providerProductId,
      plan: choice.plan,
      interval: choice.interval,
      returnUrl: this.pages.checkoutReturn,
      cancelUrl: this.pages.checkoutCancel,
    })
    await this.billing.saveCheckout(workspace.id, session)
    this.recordCheckout(workspace, choice, false)
    return session.url
  }

  private recordCheckout(
    workspace: WorkspaceOwner,
    choice: ChoosePlanInput,
    resumed: boolean
  ): void {
    this.analytics.capture(actorOf(workspace), {
      name: "checkout_started",
      plan: choice.plan,
      billing_interval: choice.interval,
      price_usd: priceUsd(choice.plan, choice.interval),
      resumed,
    })
  }

  async changePlan(
    workspace: WorkspaceRecord,
    choice: ChoosePlanInput
  ): Promise<PlanChangeResult> {
    return this.operations.run(workspace.id, () =>
      this.change(workspace, choice)
    )
  }

  private async change(
    workspace: WorkspaceRecord,
    choice: ChoosePlanInput
  ): Promise<PlanChangeResult> {
    const record = await this.billing.findByWorkspace(workspace.id)
    const current = record?.subscription

    if (!current || !isEntitled(current.status)) {
      throw new PlanRequiredError("continue")
    }
    if (current.plan === choice.plan && current.interval === choice.interval) {
      throw new BadRequestError("This workspace is already on that plan.")
    }

    const plan = PLANS[choice.plan]
    const connected = await this.accounts.countConnected(workspace.id)

    if (connected > plan.channels) {
      throw new PlanLimitError(
        `${plan.name} includes ${channelCount(plan.channels)} and ${connected} are connected. Disconnect accounts first.`
      )
    }

    const paymentUrl = await this.provider.changePlan(
      current.providerSubscriptionId,
      choice.plan,
      choice.interval
    )
    this.analytics.capture(actorOf(workspace), {
      name: "plan_change_requested",
      plan: choice.plan,
      billing_interval: choice.interval,
      from_plan: current.plan,
      from_billing_interval: current.interval,
      payment_required: paymentUrl !== null,
    })
    await this.refreshSubscription(current.providerSubscriptionId)

    return { state: await this.getState(workspace), paymentUrl }
  }

  /** Returns the address where the customer manages payment, invoices and cancellation. */
  async openPortal(workspace: WorkspaceRecord): Promise<string> {
    const record = await this.billing.findByWorkspace(workspace.id)

    if (!record) {
      throw new PlanRequiredError("manage billing")
    }

    const url = await this.provider.createPortalSession(
      record.providerCustomerId,
      this.pages.portalReturn
    )
    this.analytics.capture(actorOf(workspace), {
      name: "billing_portal_opened",
    })
    return url
  }

  /**
   * Brings the stored subscription in line with the provider, for example
   * right after checkout, before its webhook arrives.
   */
  async sync(workspace: WorkspaceRecord): Promise<BillingState> {
    return this.operations.run(workspace.id, () => this.reconcile(workspace))
  }

  private async reconcile(workspace: WorkspaceRecord): Promise<BillingState> {
    const record = await this.billing.findByWorkspace(workspace.id)

    if (record) {
      const subscriptions = await this.provider.listSubscriptions(
        record.providerCustomerId
      )
      const latest = subscriptions.reduce<SubscriptionSnapshot | null>(
        (best, candidate) =>
          !best || supersedes(candidate, best) ? candidate : best,
        null
      )

      if (latest) await this.apply(workspace, latest)
      else await this.enforce(workspace, record.subscription)
    } else {
      // Includes workspaces created before billing existed. The rollout
      // reconciliation command calls sync for all running workspaces.
      await this.enforce(workspace, null)
    }

    return this.getState(workspace)
  }

  /**
   * Stores what the provider reports about one subscription now. Webhook events
   * only name the subscription, so redelivered and out-of-order events all
   * apply the same, current state.
   */
  async refreshSubscription(
    providerSubscriptionId: string
  ): Promise<WebhookOutcome> {
    const snapshot = await this.provider.getSubscription(providerSubscriptionId)
    if (!snapshot) return "ignored"

    const workspace = await this.billing.findWorkspaceByCustomer(
      snapshot.providerCustomerId
    )
    if (!workspace) return "ignored"

    return this.operations.run(workspace.id, async () => {
      // The first read only locates the workspace. Refetch under ownership so
      // a slow earlier read cannot overwrite a newer webhook's saved state.
      const current = await this.provider.getSubscription(
        providerSubscriptionId
      )
      if (
        !current ||
        current.providerCustomerId !== snapshot.providerCustomerId
      )
        return "ignored"
      await this.apply(workspace, current)
      return "processed"
    })
  }

  private async apply(
    workspace: WorkspaceOwner,
    snapshot: SubscriptionSnapshot
  ): Promise<void> {
    const record = await this.billing.findByWorkspace(workspace.id)
    const current = record?.subscription
    const replaces =
      !current ||
      current.providerSubscriptionId === snapshot.providerSubscriptionId ||
      supersedes(snapshot, current)

    if (replaces) {
      await this.billing.saveSubscription(workspace.id, snapshot)
      this.recordSubscription(workspace, current ?? null, snapshot)
    }

    const effective = replaces || !current ? snapshot : current
    await this.enforce(workspace, effective)
  }

  /**
   * Runs under the workspace's ownership, after the save, so a webhook and a
   * sync that both see one change record it once.
   */
  private recordSubscription(
    workspace: WorkspaceOwner,
    previous: SubscriptionSnapshot | null,
    current: SubscriptionSnapshot
  ): void {
    for (const event of subscriptionEvents(previous, current))
      this.analytics.capture(actorOf(workspace), event)
    this.analytics.describeWorkspace(workspace, subscriptionTraits(current))
  }

  private async enforce(
    workspace: WorkspaceOwner,
    subscription: SubscriptionSnapshot | null
  ): Promise<void> {
    const ended = !subscription || !isEntitled(subscription.status)
    if (ended) {
      // Each cleanup must run even if the other provider operation fails.
      // Report failures after both finish so webhook retries can finish them.
      const results = await Promise.allSettled([
        this.automations.pauseAll(workspace),
        this.posts.cancelAll(workspace),
      ])
      const failures = results.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : []
      )
      if (failures.length === 1) throw failures[0]
      if (failures.length > 1)
        throw new AggregateError(failures, "Could not stop workspace activity")
      return
    }
    const connected = await this.accounts.countConnected(workspace.id)
    if (connected > PLANS[subscription.plan].channels)
      await this.automations.pauseAll(workspace)
    else
      await this.automations.pauseUnsupported(
        workspace,
        PLANS[subscription.plan]
      )
  }

  private async createCustomer(
    workspace: WorkspaceRecord,
    payer: Payer
  ): Promise<string> {
    const providerCustomerId = await this.provider.createCustomer({
      workspaceId: workspace.id,
      email: payer.email,
      name: payer.name,
    })
    // A concurrent checkout may have stored a customer first; that one is kept.
    const stored = await this.billing.saveCustomer(
      workspace.id,
      providerCustomerId
    )

    return stored.providerCustomerId
  }
}
