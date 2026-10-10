import type { Database } from "@workspace/supabase/types"
import { z } from "zod"

import {
  BILLING_CURRENCIES,
  BILLING_INTERVALS,
  PLAN_IDS,
  SUBSCRIPTION_STATUSES,
} from "../../contract/billing"
import type {
  BillingRecord,
  SubscriptionSnapshot,
} from "../../modules/billing/billing"
import type { BillingRepository } from "../../modules/billing/billing.repository"
import type { DataClients } from "./data-clients"
import { completed, optional, required } from "./query"

type BillingRow = Database["public"]["Tables"]["workspace_billing"]["Row"]

const subscriptionSchema = z.object({
  dodo_subscription_id: z.string(),
  plan: z.enum(PLAN_IDS),
  billing_interval: z.enum(BILLING_INTERVALS),
  status: z.enum(SUBSCRIPTION_STATUSES),
  currency: z.enum(BILLING_CURRENCIES),
  current_period_end: z.string(),
  cancel_at_period_end: z.boolean(),
  subscription_created_at: z.string(),
})

function toRecord(row: BillingRow): BillingRecord {
  // The table keeps the subscription columns all set or all empty.
  if (row.dodo_subscription_id === null) {
    return {
      workspaceId: row.workspace_id,
      providerCustomerId: row.dodo_customer_id,
      subscription: null,
    }
  }

  const subscription = subscriptionSchema.parse(row)
  return {
    workspaceId: row.workspace_id,
    providerCustomerId: row.dodo_customer_id,
    subscription: {
      providerSubscriptionId: subscription.dodo_subscription_id,
      providerCustomerId: row.dodo_customer_id,
      plan: subscription.plan,
      interval: subscription.billing_interval,
      status: subscription.status,
      currency: subscription.currency,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: subscription.subscription_created_at,
    },
  }
}

export class SupabaseBillingRepository implements BillingRepository {
  constructor(private readonly db: DataClients) {}

  async findByWorkspace(workspaceId: string): Promise<BillingRecord | null> {
    const row = optional(
      await this.db.scoped
        .from("workspace_billing")
        .select()
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
      "load the workspace's billing"
    )

    return row ? toRecord(row) : null
  }

  async findWorkspaceIdByCustomer(
    providerCustomerId: string
  ): Promise<string | null> {
    const row = optional(
      await this.db.privileged
        .from("workspace_billing")
        .select("workspace_id")
        .eq("dodo_customer_id", providerCustomerId)
        .maybeSingle(),
      "find the workspace of a billing customer"
    )

    return row?.workspace_id ?? null
  }

  async saveCustomer(
    workspaceId: string,
    providerCustomerId: string
  ): Promise<BillingRecord> {
    completed(
      await this.db.privileged
        .from("workspace_billing")
        .upsert(
          { workspace_id: workspaceId, dodo_customer_id: providerCustomerId },
          { onConflict: "workspace_id", ignoreDuplicates: true }
        ),
      "store the billing customer"
    )

    const row = required(
      await this.db.privileged
        .from("workspace_billing")
        .select()
        .eq("workspace_id", workspaceId)
        .single(),
      "load the billing customer"
    )

    return toRecord(row)
  }

  async saveSubscription(
    workspaceId: string,
    subscription: SubscriptionSnapshot
  ): Promise<void> {
    required(
      await this.db.privileged
        .from("workspace_billing")
        .update({
          dodo_subscription_id: subscription.providerSubscriptionId,
          plan: subscription.plan,
          billing_interval: subscription.interval,
          status: subscription.status,
          currency: subscription.currency,
          current_period_end: subscription.currentPeriodEnd,
          cancel_at_period_end: subscription.cancelAtPeriodEnd,
          subscription_created_at: subscription.createdAt,
        })
        .eq("workspace_id", workspaceId)
        .eq("dodo_customer_id", subscription.providerCustomerId)
        .select("workspace_id")
        .single(),
      "store the subscription"
    )
  }
}
