import { z } from "zod"

export const API_KEY_SCOPES = [
  "workspace:read",
  "accounts:read",
  "automations:read",
  "automations:write",
  "contacts:read",
  "inbox:read",
  "inbox:write",
] as const

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export const API_KEY_READ_SCOPES: ApiKeyScope[] = [
  "workspace:read",
  "accounts:read",
  "automations:read",
  "contacts:read",
  "inbox:read",
]

export const API_KEY_NAME_MAX_LENGTH = 80

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(API_KEY_NAME_MAX_LENGTH),
  scopes: z
    .array(z.enum(API_KEY_SCOPES))
    .min(1)
    .max(API_KEY_SCOPES.length)
    .transform((scopes) => [...new Set(scopes)]),
  expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>

/** Safe to list. The full token is returned only when the key is created. */
export type ApiKey = {
  id: string
  name: string
  prefix: string
  scopes: ApiKeyScope[]
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
}

export type CreatedApiKey = { key: ApiKey; token: string }
