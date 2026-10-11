import { isEntitled, PLANS, type Plan } from "../../contract/billing"
import { PlanLimitError, PlanRequiredError } from "../../shared/errors"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { BillingRepository } from "./billing.repository"

/** Counts the Instagram accounts a plan's limit applies to. */
export interface ConnectedAccounts {
  countConnected(workspaceId: string): Promise<number>
}

export function accountCount(count: number): string {
  return `${count} Instagram account${count === 1 ? "" : "s"}`
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
    const plan = await this.currentPlan(workspace, "connect Instagram")
    const connected = await this.accounts.countConnected(workspace.id)

    if (connected >= plan.instagramAccounts) {
      throw new PlanLimitError(
        `${plan.name} includes ${accountCount(plan.instagramAccounts)}. Upgrade to connect another.`
      )
    }
  }

  async assertCanRunAutomations(workspace: WorkspaceRecord): Promise<void> {
    const plan = await this.currentPlan(workspace, "turn automations on")
    const connected = await this.accounts.countConnected(workspace.id)

    if (connected > plan.instagramAccounts) {
      throw new PlanLimitError(
        `${plan.name} includes ${accountCount(plan.instagramAccounts)} and ${connected} are connected. Disconnect one or upgrade to turn automations on.`
      )
    }
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
