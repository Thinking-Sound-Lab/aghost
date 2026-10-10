import { z } from "zod"

export const API_ERROR_CODES = [
  "unauthenticated",
  "forbidden",
  "bad_request",
  "validation_failed",
  "not_found",
  "conflict",
  "account_disconnected",
  "invalid_webhook_signature",
  "provider_rate_limited",
  "provider_error",
  "integration_not_configured",
  "internal_error",
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

/** Body of every non-2xx response the API returns. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    // Present on `validation_failed`: one message per invalid field, keyed by
    // the field's dotted path (for example `dmButtons.0.url`).
    fields: z.record(z.string(), z.string()).optional(),
  }),
})

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
