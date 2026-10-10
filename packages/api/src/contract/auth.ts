import { z } from "zod"

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address").trim(),
  password: z.string().min(8, "Use at least 8 characters").max(128),
})

export const emailSchema = z.object({ email: credentialsSchema.shape.email })
export const passwordSchema = z.object({
  password: credentialsSchema.shape.password,
})
export type Credentials = z.infer<typeof credentialsSchema>
export type SessionUser = { id: string; email: string }
export type SignUpResult = {
  user: SessionUser | null
  needsConfirmation: boolean
}
export type IntegrationStatus = { instagramConfigured: boolean }
