import type { ApiErrorCode } from "../contract/errors"

type AppErrorOptions = {
  fields?: Record<string, string>
  cause?: unknown
}

/**
 * An expected failure with a stable code. The HTTP layer turns the code into a
 * status; nothing below it knows about HTTP.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly fields?: Record<string, string>

  constructor(code: ApiErrorCode, message: string, options?: AppErrorOptions) {
    super(message, { cause: options?.cause })
    this.name = new.target.name
    this.code = code
    this.fields = options?.fields
  }
}

export class UnauthenticatedError extends AppError {
  constructor() {
    super("unauthenticated", "Sign in to continue.")
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("bad_request", message, { cause })
  }
}

export class ForbiddenError extends AppError {
  constructor(scope: string) {
    super("forbidden", `This API key requires the ${scope} permission.`)
  }
}

export class InvalidApiKeyError extends AppError {
  constructor() {
    super(
      "unauthenticated",
      "Provide a valid, unexpired API key as a Bearer token."
    )
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super("validation_failed", "Some fields need your attention.", { fields })
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("not_found", `${resource} was not found.`)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("conflict", message, { cause })
  }
}

export class AccountDisconnectedError extends AppError {
  constructor(username: string) {
    super(
      "account_disconnected",
      `@${username} is disconnected. Reconnect it to continue.`
    )
  }
}

/** The workspace has no plan, or its plan has ended. */
export class PlanRequiredError extends AppError {
  constructor(action: string) {
    super("plan_required", `Choose a plan to ${action}.`)
  }
}

/** The workspace's plan does not include another Instagram account. */
export class PlanLimitError extends AppError {
  constructor(message: string) {
    super("plan_limit_reached", message)
  }
}

export class InvalidWebhookSignatureError extends AppError {
  constructor() {
    super("invalid_webhook_signature", "The webhook signature is not valid.")
  }
}

/** The upstream provider refused or failed a request. */
export class ProviderError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("provider_error", message, { cause })
  }
}

export class ProviderRateLimitedError extends AppError {
  constructor(cause?: unknown) {
    super(
      "provider_rate_limited",
      "Too many requests right now. Try again in a moment.",
      { cause }
    )
  }
}

/** An invariant the system relies on does not hold. Always a bug or bad data. */
export class InternalError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("internal_error", message, { cause })
  }
}

export class IntegrationNotConfiguredError extends AppError {
  constructor() {
    super(
      "integration_not_configured",
      "Instagram connection is not available yet. Contact your workspace administrator."
    )
  }
}

export class BillingNotConfiguredError extends AppError {
  constructor() {
    super(
      "integration_not_configured",
      "Billing is not available yet. Contact your workspace administrator."
    )
  }
}
