export type WorkspaceRecord = {
  id: string
  ownerId: string
  name: string
  /** Provider profile that holds this workspace's accounts. Null until one is created. */
  providerProfileId: string | null
}
