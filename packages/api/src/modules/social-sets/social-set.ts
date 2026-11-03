export type SocialSetRecord = {
  id: string
  workspaceId: string
  name: string
  /** Provider profile that holds the set's accounts. Null until its first connection. */
  providerProfileId: string | null
  createdAt: string
}
