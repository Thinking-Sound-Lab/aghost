import type { Database } from "@workspace/supabase/types"
import { z } from "zod"

import {
  BILLING_CURRENCIES,
  BILLING_INTERVALS,
  PLAN_IDS,
  SUBSCRIPTION_STATUSES,
  type ChoosePlanInput,
} from "../../contract/billing"
import type {
  BillingRecord,
  CheckoutSession,
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
  const checkout =
    row.checkout_plan === null
      ? null
      : {
          plan: z.enum(PLAN_IDS).parse(row.checkout_plan),
          interval: z.enum(BILLING_INTERVALS).parse(row.checkout_interval),
          requestedAt: z.string().parse(row.checkout_requested_at),
          session:
            row.checkout_session_id === null
              ? null
              : {
                  providerSessionId: row.checkout_session_id,
                  url: z.string().parse(row.checkout_url),
                },
        }
  // The table keeps the subscription columns all set or all empty.
  if (row.dodo_subscription_id === null) {
    return {
      workspaceId: row.workspace_id,
      providerCustomerId: row.dodo_customer_id,
      subscription: null,
      checkout,
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
    checkout,
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

  async reserveCheckout(
    workspaceId: string,
    choice: ChoosePlanInput
  ): Promise<void> {
    required(
      await this.db.privileged
        .from("workspace_billing")
        .update({
          checkout_plan: choice.plan,
          checkout_interval: choice.interval,
          checkout_requested_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId)
        .is("checkout_plan", null)
        .select("workspace_id")
        .single(),
      "reserve checkout"
    )
  }

  async saveCheckout(
    workspaceId: string,
    session: CheckoutSession
  ): Promise<void> {
    required(
      await this.db.privileged
        .from("workspace_billing")
        .update({
          checkout_session_id: session.providerSessionId,
          checkout_url: session.url,
        })
        .eq("workspace_id", workspaceId)
        .not("checkout_plan", "is", null)
        .is("checkout_session_id", null)
        .select("workspace_id")
        .single(),
      "store checkout"
    )
  }

  async clearCheckout(workspaceId: string): Promise<void> {
    required(
      await this.db.privileged
        .from("workspace_billing")
        .update({
          checkout_plan: null,
          checkout_interval: null,
          checkout_requested_at: null,
          checkout_session_id: null,
          checkout_url: null,
        })
        .eq("workspace_id", workspaceId)
        .select("workspace_id")
        .single(),
      "clear the previous checkout"
    )
  }
}
