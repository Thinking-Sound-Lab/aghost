import type { WorkspaceRecord } from "./workspace"

export interface WorkspaceRepository {
  findByOwnerId(ownerId: string): Promise<WorkspaceRecord | null>
  findByProviderProfileId(
    providerProfileId: string
  ): Promise<WorkspaceRecord | null>
  rename(id: string, name: string): Promise<WorkspaceRecord>
  setProviderProfileId(
    id: string,
    providerProfileId: string
  ): Promise<WorkspaceRecord>
}
