import type { PostgrestError } from "@supabase/supabase-js"

import { InternalError } from "../../shared/errors"

type QueryResult = { data: unknown; error: PostgrestError | null }

function assertSucceeded(
  error: PostgrestError | null,
  operation: string
): void {
  if (error) {
    throw new InternalError(
      `Database error while trying to ${operation}: ${error.message}`,
      error
    )
  }
}

/** Result of a query that may legitimately match nothing. */
export function optional<Result extends QueryResult>(
  result: Result,
  operation: string
): Result["data"] {
  assertSucceeded(result.error, operation)
  return result.data
}

/** Result of a query that must return data. */
export function required<Result extends QueryResult>(
  result: Result,
  operation: string
): NonNullable<Result["data"]> {
  assertSucceeded(result.error, operation)

  if (result.data === null) {
    throw new InternalError(
      `Database returned nothing while trying to ${operation}.`
    )
  }

  return result.data as NonNullable<Result["data"]>
}

/** Result of a statement that returns no data. */
export function completed(
  result: { error: PostgrestError | null },
  operation: string
): void {
  assertSucceeded(result.error, operation)
}
