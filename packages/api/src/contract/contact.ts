import { z } from "zod"

export const CONTACT_PAGE_SIZE = 50

/** Someone who has messaged or been messaged by the workspace on Instagram. */
export type Contact = {
  id: string
  name: string | null
  /** The Instagram handle, without the @. */
  username: string | null
  avatarUrl: string | null
  tags: string[]
  /** The latest message in either direction. */
  lastMessageAt: string | null
  createdAt: string | null
}

export type ContactPage = {
  contacts: Contact[]
  total: number
  hasMore: boolean
}

export const contactPageQuerySchema = z.object({
  search: z.string().trim().max(100).default(""),
  offset: z
    .string()
    .regex(/^\d+$/, "Expected a whole number")
    .transform(Number)
    .default(0),
})

export type ContactPageQuery = z.infer<typeof contactPageQuerySchema>
