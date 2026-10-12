export type SessionUser = {
  id: string
  email: string
  // Optional while older API deployments still return only id and email.
  name?: string | null
  avatarUrl?: string | null
}
export type IntegrationStatus = {
  instagramConfigured: boolean
  billingConfigured: boolean
}
