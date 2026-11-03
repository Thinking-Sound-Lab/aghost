export type WorkspaceRecord = {
  id: string
  ownerId: string
  name: string
}

/** Enough of a workspace to act for it: its id and the person who owns it. */
export type WorkspaceOwner = Pick<WorkspaceRecord, "id" | "ownerId">
