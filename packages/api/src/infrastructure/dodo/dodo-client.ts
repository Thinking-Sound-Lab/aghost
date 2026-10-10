import DodoPayments, { APIError, RateLimitError } from "dodopayments"

import type { ApiConfig } from "../../config"
import {
  AppError,
  BillingNotConfiguredError,
  ProviderError,
  ProviderRateLimitedError,
} from "../../shared/errors"

export type DodoClient = DodoPayments
export type DodoAccess = () => DodoClient

export function createDodoClient(config: ApiConfig["dodo"]): DodoClient {
  if (!config.apiKey) throw new BillingNotConfiguredError()
  return new DodoPayments({
    bearerToken: config.apiKey,
    environment: config.environment,
    webhookKey: config.webhookKey || null,
  })
}

/**
 * Sends a request and turns a failure into an application error. `action`
 * completes the sentence "Couldn't ...", for example "start checkout".
 */
export async function request<Result>(
  action: string,
  send: () => Promise<Result>
): Promise<Result> {
  try {
    return await send()
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof RateLimitError)
      throw new ProviderRateLimitedError(error)
    if (error instanceof APIError)
      throw new ProviderError(`Couldn't ${action}. ${error.message}`, error)
    throw new ProviderError(
      `Couldn't ${action}. The request did not complete.`,
      error
    )
  }
}
