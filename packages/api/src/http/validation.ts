import type { z } from "zod"
import { ValidationError } from "../shared/errors"

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues)
      fields[issue.path.join(".")] = issue.message
    throw new ValidationError(fields)
  }
  return result.data
}
