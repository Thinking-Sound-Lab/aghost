import type { z } from "zod"

/**
 * Reads configuration from environment variables. A missing or malformed
 * variable stops the process with a message that names each one.
 *
 * @param subject What is being configured, for example "The API".
 */
export function parseEnvironment<T extends z.ZodType>(
  schema: T,
  environment: Record<string, string | undefined>,
  subject: string
): z.output<T> {
  const result = schema.safeParse(environment)
  if (result.success) return result.data

  const problems = result.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")

  throw new Error(
    `${subject} is not configured correctly. Check these environment variables:\n${problems}`
  )
}
