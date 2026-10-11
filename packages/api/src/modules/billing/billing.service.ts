import {
  isEntitled,
  PLANS,
  type BillingState,
  type ChoosePlanInput,
  type PlanChangeResult,
} from "../../contract/billing"
import {
  BadRequestError,
  ConflictError,
  PlanLimitError,
  PlanRequiredError,
} from "../../shared/errors"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import { supersedes, type SubscriptionSnapshot } from "./billing"
import type { BillingProvider } from "./billing.provider"
import type { BillingRepository } from "./billing.repository"
import { accountCount, type ConnectedAccounts } from "./plan-entitlements"

/** Stops the automations of a workspace whose plan has ended. */
export interface WorkspaceAutomations {
  pauseAll(workspaceId: string): Promise<void>
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
    private readonly pages: BillingPages,
    private readonly operations: WorkspaceOperations
  ) {}

  async getState(workspace: WorkspaceRecord): Promise<BillingState> {
    const [record, connectedAccounts] = await Promise.all([
      this.billing.findByWorkspace(workspace.id),
      this.accounts.countConnected(workspace.id),
    ])
    const snapshot = record?.subscription ?? null

    return {
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
      )
        return checkout.session.url
      // The customer chose another plan, or the link can no longer be paid.
      // Dodo cannot revoke a link, so an unpaid one replaced here stays
      // payable until it expires.
      await this.billing.clearCheckout(workspace.id)
    }

    const providerProductId = await this.provider.prepareCheckout(
      choice.plan,
      choice.interval
    )
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
    return session.url
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

    if (connected > plan.instagramAccounts) {
      throw new PlanLimitError(
        `${plan.name} includes ${accountCount(plan.instagramAccounts)} and ${connected} are connected. Disconnect accounts first.`
      )
    }

    const paymentUrl = await this.provider.changePlan(
      current.providerSubscriptionId,
      choice.plan,
      choice.interval
    )
    await this.refreshSubscription(current.providerSubscriptionId)

    return { state: await this.getState(workspace), paymentUrl }
  }

  /** Returns the address where the customer manages payment, invoices and cancellation. */
  async openPortal(workspace: WorkspaceRecord): Promise<string> {
    const record = await this.billing.findByWorkspace(workspace.id)

    if (!record) {
      throw new PlanRequiredError("manage billing")
    }

    return this.provider.createPortalSession(
      record.providerCustomerId,
      this.pages.portalReturn
    )
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

      if (latest) await this.apply(workspace.id, latest)
      else await this.enforce(workspace.id, record.subscription)
    } else {
      // Includes workspaces created before billing existed. The rollout
      // reconciliation command calls sync for all running workspaces.
      await this.enforce(workspace.id, null)
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

    const workspaceId = await this.billing.findWorkspaceIdByCustomer(
      snapshot.providerCustomerId
    )
    if (!workspaceId) return "ignored"

    return this.operations.run(workspaceId, async () => {
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
      await this.apply(workspaceId, current)
      return "processed"
    })
  }

  private async apply(
    workspaceId: string,
    snapshot: SubscriptionSnapshot
  ): Promise<void> {
    const record = await this.billing.findByWorkspace(workspaceId)
    const current = record?.subscription
    const replaces =
      !current ||
      current.providerSubscriptionId === snapshot.providerSubscriptionId ||
      supersedes(snapshot, current)

    if (replaces) await this.billing.saveSubscription(workspaceId, snapshot)

    const effective = replaces || !current ? snapshot : current
    await this.enforce(workspaceId, effective)
  }

  private async enforce(
    workspaceId: string,
    subscription: SubscriptionSnapshot | null
  ): Promise<void> {
    const connected = await this.accounts.countConnected(workspaceId)
    if (
      !subscription ||
      !isEntitled(subscription.status) ||
      connected > PLANS[subscription.plan].instagramAccounts
    ) {
      await this.automations.pauseAll(workspaceId)
    }
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
