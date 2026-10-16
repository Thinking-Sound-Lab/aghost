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

/** The post whose comments the provider watches. */
export type PostBinding =
  | { scope: "any_post" }
  | { scope: "platform_post"; platformPostId: string; caption: string | null }
  /** A post the provider has yet to publish: watching starts once it does. */
  | { scope: "scheduled_post"; providerPostId: string; caption: string | null }

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
    status: AutomationStatus,
    post: PostBinding
  ): Promise<string>
  /** A null `post` keeps watching the post it watched before. */
  update(
    providerAutomationId: string,
    config: AutomationConfig,
    status: AutomationStatus,
    post: PostBinding | null
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
