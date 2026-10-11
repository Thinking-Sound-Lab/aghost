export type WorkspaceRecord = {
  id: string
  ownerId: string
  name: string
  /** Provider profile that holds this workspace's accounts. Null until one is created. */
  providerProfileId: string | null
}

/** Enough of a workspace to act for it: its id and the person who owns it. */
export type WorkspaceOwner = Pick<WorkspaceRecord, "id" | "ownerId">
