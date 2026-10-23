import { isEntitled, PLANS, type Plan } from "../../contract/billing"
import { PlanLimitError, PlanRequiredError } from "../../shared/errors"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { BillingRepository } from "./billing.repository"
import type { AutomationConfig } from "../automations/automation"

export function supportsAutomation(
  plan: Plan,
  config: AutomationConfig
): boolean {
  return (
    (!config.productCarousel || plan.features.productCarousel) &&
    (!config.followUp || plan.features.followUpNudge)
  )
}

/** Counts the accounts a plan's limit applies to, on every platform. */
export interface ConnectedAccounts {
  countConnected(workspaceId: string): Promise<number>
}

export function channelCount(count: number): string {
  return `${count} channel${count === 1 ? "" : "s"}`
}

/** Decides what a workspace may do on its current plan. */
export class PlanEntitlements {
  constructor(
    private readonly billing: BillingRepository,
    private readonly accounts: ConnectedAccounts
  ) {}

  /** The paywall: without a plan, a workspace can only reach billing. */
  async assertCanUseWorkspace(workspace: WorkspaceRecord): Promise<void> {
    await this.currentPlan(workspace, "use this workspace")
  }

  async assertCanConnectAccount(workspace: WorkspaceRecord): Promise<void> {
    const plan = await this.currentPlan(workspace, "connect a channel")
    const connected = await this.accounts.countConnected(workspace.id)

    if (connected >= plan.channels) {
      throw new PlanLimitError(
        `${plan.name} includes ${channelCount(plan.channels)}. Upgrade to connect another.`
      )
    }
  }

  async assertCanRunAutomations(workspace: WorkspaceRecord): Promise<void> {
    const plan = await this.currentPlan(workspace, "turn automations on")
    const connected = await this.accounts.countConnected(workspace.id)

    if (connected > plan.channels) {
      throw new PlanLimitError(
        `${plan.name} includes ${channelCount(plan.channels)} and ${connected} are connected. Disconnect one or upgrade to turn automations on.`
      )
    }
  }

  async assertCanUseAutomationFeatures(
    workspace: WorkspaceRecord,
    config: AutomationConfig
  ): Promise<void> {
    const plan = await this.currentPlan(workspace, "configure automations")
    if (config.productCarousel && !plan.features.productCarousel)
      throw new PlanLimitError(
        "Product carousels are included on Growth, Business and Ultimate. Upgrade to use them."
      )
    if (config.followUp && !plan.features.followUpNudge)
      throw new PlanLimitError(
        "Follow-up nudges are included on Business and Ultimate. Upgrade to use them."
      )
  }

  private async currentPlan(
    workspace: WorkspaceRecord,
    action: string
  ): Promise<Plan> {
    const record = await this.billing.findByWorkspace(workspace.id)
    const subscription = record?.subscription

    if (!subscription || !isEntitled(subscription.status)) {
      throw new PlanRequiredError(action)
    }

    return PLANS[subscription.plan]
  }
}
