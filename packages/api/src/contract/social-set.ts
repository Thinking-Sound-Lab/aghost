import { z } from "zod"

/**
 * A group of channels with one account on each platform, such as one brand.
 * Plans include a number of them.
 */
export type SocialSet = {
  id: string
  name: string
  createdAt: string
}

export const socialSetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the social set")
    .max(60, "Keep the name to 60 characters"),
})

export type SocialSetInput = z.infer<typeof socialSetSchema>
