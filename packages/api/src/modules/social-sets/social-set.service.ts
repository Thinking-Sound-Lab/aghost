import type { SocialSetInput } from "../../contract/social-set"
import {
  ConflictError,
  InternalError,
  NotFoundError,
} from "../../shared/errors"
import type { AccountRepository } from "../accounts/account.repository"
import { actorOf, type ProductAnalytics } from "../analytics/analytics"
import type { ProfileProvider } from "../workspaces/profile.provider"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceOperations } from "../workspaces/workspace-operations"
import type { SocialSetRecord } from "./social-set"
import type { SocialSetRepository } from "./social-set.repository"

/** Checks that the workspace's plan has room for another social set. */
export interface SocialSetPlan {
  assertCanAddSocialSet(workspace: WorkspaceRecord): Promise<void>
}

export class SocialSetService {
  constructor(
    private readonly sets: SocialSetRepository,
    private readonly accounts: Pick<AccountRepository, "listByWorkspace">,
    private readonly profiles: ProfileProvider,
    private readonly plan: SocialSetPlan,
    private readonly operations: WorkspaceOperations,
    private readonly analytics: ProductAnalytics
  ) {}

  list(workspace: WorkspaceRecord): Promise<SocialSetRecord[]> {
    return this.sets.listByWorkspace(workspace.id)
  }

  async get(workspace: WorkspaceRecord, id: string): Promise<SocialSetRecord> {
    const set = await this.sets.findById(workspace.id, id)
    if (!set) throw new NotFoundError("Social set")
    return set
  }

  /** The named set, or the first one for clients from before sets. */
  async resolve(
    workspace: WorkspaceRecord,
    id: string | undefined
  ): Promise<SocialSetRecord> {
    if (id) return this.get(workspace, id)
    const [first] = await this.sets.listByWorkspace(workspace.id)
    // The database gives every workspace a set when it is created.
    if (!first)
      throw new InternalError(`Workspace ${workspace.id} has no social set.`)
    return first
  }

  async create(
    workspace: WorkspaceRecord,
    input: SocialSetInput
  ): Promise<SocialSetRecord> {
    return this.operations.run(workspace.id, async () => {
      await this.plan.assertCanAddSocialSet(workspace)
      const set = await this.sets.create(workspace.id, input.name)
      this.analytics.capture(actorOf(workspace), { name: "social_set_created" })
      return set
    })
  }

  async rename(
    workspace: WorkspaceRecord,
    id: string,
    input: SocialSetInput
  ): Promise<SocialSetRecord> {
    const set = await this.get(workspace, id)
    return this.sets.rename(workspace.id, set.id, input.name)
  }

  /** Deletes an empty set with its provider profile. The last set stays. */
  async delete(workspace: WorkspaceRecord, id: string): Promise<void> {
    return this.operations.run(workspace.id, async () => {
      const set = await this.get(workspace, id)
      const [sets, accounts] = await Promise.all([
        this.sets.listByWorkspace(workspace.id),
        this.accounts.listByWorkspace(workspace.id),
      ])
      if (sets.length === 1)
        throw new ConflictError("A workspace keeps at least one social set.")
      if (accounts.some((account) => account.socialSetId === set.id))
        throw new ConflictError("Remove the channels in this set first.")
      if (set.providerProfileId)
        await this.profiles.deleteProfile(set.providerProfileId)
      await this.sets.delete(workspace.id, set.id)
      this.analytics.capture(actorOf(workspace), { name: "social_set_deleted" })
    })
  }

  /** The set's provider profile, created with its first connection. */
  async ensureProviderProfile(set: SocialSetRecord): Promise<string> {
    if (set.providerProfileId) return set.providerProfileId
    // The set id is the profile name, so a retry after a half-finished
    // attempt finds the same profile instead of creating a second one.
    const providerProfileId = await this.profiles.ensureProfile(set.id)
    await this.sets.setProviderProfileId(
      set.workspaceId,
      set.id,
      providerProfileId
    )
    return providerProfileId
  }
}
