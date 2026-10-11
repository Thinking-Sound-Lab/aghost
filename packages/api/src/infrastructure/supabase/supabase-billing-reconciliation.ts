import type { DatabaseClient } from "@workspace/supabase/server"
import type { BillingService } from "../../modules/billing/billing.service"
import { required } from "./query"
import { SupabaseWorkspaceRepository } from "./supabase-workspace.repository"

/** Brings pre-billing automations under the same policy as subscription webhooks. */
export class SupabaseBillingReconciliation {
  constructor(
    private readonly db: DatabaseClient,
    private readonly billing: BillingService
  ) {}

  async run(log: (message: string) => void): Promise<number> {
    const ids = new Set<string>()
    // Collect before pausing, so changing statuses cannot shift pagination.
    for (let offset = 0; ; offset += 1_000) {
      const rows = required(
        await this.db
          .from("automations")
          .select("workspace_id")
          .eq("status", "active")
          .order("id")
          .range(offset, offset + 999),
        "list workspaces with running automations"
      )
      for (const row of rows) ids.add(row.workspace_id)
      if (rows.length < 1_000) break
    }

    const workspaces = new SupabaseWorkspaceRepository({
      scoped: this.db,
      privileged: this.db,
    })
    const failures: unknown[] = []
    for (const id of ids) {
      try {
        const workspace = await workspaces.findById(id)
        if (!workspace) continue
        await this.billing.sync(workspace)
        log(`Reconciled workspace ${id}`)
      } catch (error) {
        failures.push(error)
        log(
          `Reconciliation failed for workspace ${id}; rerun after resolving the error.`
        )
      }
    }
    if (failures.length)
      throw new AggregateError(
        failures,
        "Billing rollout reconciliation did not finish."
      )
    return ids.size
  }
}
