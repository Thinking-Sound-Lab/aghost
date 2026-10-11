import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"
import { setTimeout } from "node:timers/promises"
import type { DatabaseClient } from "@workspace/supabase/server"
import type { WorkspaceOperations } from "../../modules/workspaces/workspace-operations"
import { ConflictError } from "../../shared/errors"
import { completed, required } from "./query"

/**
 * A durable, service-role-only mutex. It deliberately has no timeout that
 * transfers ownership: an old process could still be making a provider call.
 * A crashed owner's claim needs operator recovery after that process is stopped.
 */
export class SupabaseWorkspaceOperations implements WorkspaceOperations {
  private readonly ownership = new AsyncLocalStorage<ReadonlySet<string>>()

  constructor(private readonly db: DatabaseClient) {}

  async run<T>(workspaceId: string, work: () => Promise<T>): Promise<T> {
    const held = this.ownership.getStore()
    if (held?.has(workspaceId)) return work()

    const owner = randomUUID()
    const deadline = Date.now() + 5_000
    while (true) {
      const claimed = required(
        await this.db.rpc("claim_workspace_operation", {
          p_workspace_id: workspaceId,
          p_owner: owner,
        }),
        "coordinate a workspace operation"
      )
      if (claimed) break
      if (Date.now() >= deadline) {
        throw new ConflictError(
          "Another change is in progress for this workspace. Try again in a moment."
        )
      }
      await setTimeout(100)
    }

    try {
      return await this.ownership.run(
        new Set([...(held ?? []), workspaceId]),
        work
      )
    } finally {
      completed(
        await this.db.rpc("release_workspace_operation", {
          p_workspace_id: workspaceId,
          p_owner: owner,
        }),
        "finish a workspace operation"
      )
    }
  }
}
