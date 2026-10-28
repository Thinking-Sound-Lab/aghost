import type { SocialSetRecord } from "./social-set"

export interface SocialSetRepository {
  /** Oldest first: the first set is where older clients connect accounts. */
  listByWorkspace(workspaceId: string): Promise<SocialSetRecord[]>
  findById(workspaceId: string, id: string): Promise<SocialSetRecord | null>
  create(workspaceId: string, name: string): Promise<SocialSetRecord>
  rename(
    workspaceId: string,
    id: string,
    name: string
  ): Promise<SocialSetRecord>
  setProviderProfileId(
    workspaceId: string,
    id: string,
    providerProfileId: string
  ): Promise<SocialSetRecord>
  delete(workspaceId: string, id: string): Promise<void>
}
