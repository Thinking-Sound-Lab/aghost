import { InternalError } from "../../shared/errors"
import type { ProfileProvider } from "./profile.provider"
import type { WorkspaceRecord } from "./workspace"
import type { WorkspaceRepository } from "./workspace.repository"

export class WorkspaceService {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly profiles: ProfileProvider
  ) {}

  async getForOwner(ownerId: string): Promise<WorkspaceRecord> {
    const workspace = await this.workspaces.findByOwnerId(ownerId)

    if (!workspace) {
      // The database creates a workspace with every user, so this is never a
      // normal "not found".
      throw new InternalError(`User ${ownerId} has no workspace.`)
    }

    return workspace
  }

  rename(workspace: WorkspaceRecord, name: string): Promise<WorkspaceRecord> {
    return this.workspaces.rename(workspace.id, name)
  }

  /** Returns the workspace's provider profile id, creating the profile first if needed. */
  async ensureProviderProfile(workspace: WorkspaceRecord): Promise<string> {
    if (workspace.providerProfileId) {
      return workspace.providerProfileId
    }

    // The workspace id is the profile name, so a retry after a half-finished
    // attempt finds the same profile instead of creating a second one.
    const providerProfileId = await this.profiles.ensureProfile(workspace.id)
    await this.workspaces.setProviderProfileId(workspace.id, providerProfileId)

    return providerProfileId
  }
}
