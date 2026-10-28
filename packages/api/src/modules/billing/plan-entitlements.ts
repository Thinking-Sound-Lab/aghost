import {
  isEntitled,
  PLANS,
  socialSetCount,
  type Plan,
} from "../../contract/billing"
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

/** Counts the social sets a plan's limit applies to. */
export interface SocialSetCounts {
  countSocialSets(workspaceId: string): Promise<number>
}

/** Decides what a workspace may do on its current plan. */
export class PlanEntitlements {
  constructor(
    private readonly billing: BillingRepository,
    private readonly sets: SocialSetCounts
  ) {}

  /** The paywall: without a plan, a workspace can only reach billing. */
  async assertCanUseWorkspace(workspace: WorkspaceRecord): Promise<void> {
    await this.currentPlan(workspace, "use this workspace")
  }

  async assertCanAddSocialSet(workspace: WorkspaceRecord): Promise<void> {
    const plan = await this.currentPlan(workspace, "add a social set")
    const sets = await this.sets.countSocialSets(workspace.id)

    if (sets >= plan.socialSets) {
      throw new PlanLimitError(
        `${plan.name} includes ${socialSetCount(plan.socialSets)}. Upgrade to add another.`
      )
    }
  }

  /** A set holds one account per platform; the plan decides how many sets. */
  async assertCanConnectAccount(workspace: WorkspaceRecord): Promise<void> {
    await this.assertWithinSets(workspace, "connect a channel")
  }

  async assertCanRunAutomations(workspace: WorkspaceRecord): Promise<void> {
    await this.assertWithinSets(workspace, "turn automations on")
  }

  async assertCanUseAutomationFeatures(
    workspace: WorkspaceRecord,
    config: AutomationConfig
  ): Promise<void> {
    const plan = await this.currentPlan(workspace, "configure automations")
    if (config.productCarousel && !plan.features.productCarousel)
      throw new PlanLimitError(
        "Product carousels are included on Growth and Business. Upgrade to use them."
      )
    if (config.followUp && !plan.features.followUpNudge)
      throw new PlanLimitError(
        "Follow-up nudges are included on Business. Upgrade to use them."
      )
  }

  /** After a downgrade, a workspace with more sets than its plan must delete some. */
  private async assertWithinSets(
    workspace: WorkspaceRecord,
    action: string
  ): Promise<void> {
    const plan = await this.currentPlan(workspace, action)
    const sets = await this.sets.countSocialSets(workspace.id)

    if (sets > plan.socialSets) {
      throw new PlanLimitError(
        `${plan.name} includes ${socialSetCount(plan.socialSets)} and this workspace has ${sets}. Delete one or upgrade to ${action}.`
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
