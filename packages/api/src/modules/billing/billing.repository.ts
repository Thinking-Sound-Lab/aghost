import type { ChoosePlanInput } from "../../contract/billing"
import type { WorkspaceOwner } from "../workspaces/workspace"
import type {
  BillingRecord,
  CheckoutSession,
  SubscriptionSnapshot,
} from "./billing"

export interface BillingRepository {
  findByWorkspace(workspaceId: string): Promise<BillingRecord | null>
  findWorkspaceByCustomer(
    providerCustomerId: string
  ): Promise<WorkspaceOwner | null>
  /**
   * Stores the workspace's customer unless it already has one, and returns the
   * record that is stored.
   */
  saveCustomer(
    workspaceId: string,
    providerCustomerId: string
  ): Promise<BillingRecord>
  saveSubscription(
    workspaceId: string,
    subscription: SubscriptionSnapshot
  ): Promise<void>
  reserveCheckout(workspaceId: string, choice: ChoosePlanInput): Promise<void>
  saveCheckout(workspaceId: string, session: CheckoutSession): Promise<void>
  clearCheckout(workspaceId: string): Promise<void>
}
