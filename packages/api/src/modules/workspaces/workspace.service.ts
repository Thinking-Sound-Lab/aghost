import { InternalError } from "../../shared/errors"
import { actorOf, type ProductAnalytics } from "../analytics/analytics"
import type { WorkspaceRecord } from "./workspace"
import type { WorkspaceRepository } from "./workspace.repository"

export class WorkspaceService {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly analytics: ProductAnalytics
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

  async rename(
    workspace: WorkspaceRecord,
    name: string
  ): Promise<WorkspaceRecord> {
    const renamed = await this.workspaces.rename(workspace.id, name)
    this.analytics.capture(actorOf(workspace), { name: "workspace_renamed" })
    this.analytics.describeWorkspace(workspace, { workspace_name: name })
    return renamed
  }
}
