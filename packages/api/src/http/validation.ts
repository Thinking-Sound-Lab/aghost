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

export async function readJson(request: {
  json(): Promise<unknown>
}): Promise<unknown> {
  try {
    return await request.json()
  } catch (error) {
    throw new BadRequestError("Send a valid JSON body.", error)
  }
}
