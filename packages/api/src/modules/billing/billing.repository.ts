import type { BillingRecord, SubscriptionSnapshot } from "./billing"

export interface BillingRepository {
  findByWorkspace(workspaceId: string): Promise<BillingRecord | null>
  findWorkspaceIdByCustomer(providerCustomerId: string): Promise<string | null>
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
}
