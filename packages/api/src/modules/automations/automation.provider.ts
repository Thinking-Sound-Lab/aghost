import type {
  AutomationActivityPage,
  AutomationStats,
  AutomationStatus,
} from "../../contract/automation"
import type { AutomationConfig } from "./automation"

/** The provider profile and account an automation runs on. */
export type AutomationTarget = {
  providerProfileId: string
  providerAccountId: string
}

export type ActivityPageRequest = {
  limit: number
  offset: number
}

/** The service that watches comments and sends the DMs. */
export interface AutomationProvider {
  /** Creates the automation and returns the provider's id for it. */
  create(
    target: AutomationTarget,
    config: AutomationConfig,
    status: AutomationStatus
  ): Promise<string>
  update(
    providerAutomationId: string,
    config: AutomationConfig,
    status: AutomationStatus
  ): Promise<void>
  setStatus(
    providerAutomationId: string,
    status: AutomationStatus
  ): Promise<void>
  /** Succeeds when the automation is already gone. */
  delete(providerAutomationId: string): Promise<void>
  /** Stats for every automation in the profile, keyed by provider automation id. */
  listStats(providerProfileId: string): Promise<Map<string, AutomationStats>>
  listActivity(
    providerAutomationId: string,
    page: ActivityPageRequest
  ): Promise<AutomationActivityPage>
}
