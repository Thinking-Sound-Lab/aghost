import type { z } from "zod"
import { BadRequestError, ValidationError } from "../shared/errors"

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

/** Request bodies reach the routes as the text that was sent. */
export function readJson(body: unknown): unknown {
  if (typeof body !== "string")
    throw new BadRequestError("Send a valid JSON body.")
  try {
    return JSON.parse(body)
  } catch (error) {
    throw new BadRequestError("Send a valid JSON body.", error)
  }
}
