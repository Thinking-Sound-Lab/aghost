import Zernio, { RateLimitError, ZernioApiError } from "@zernio/node"

import {
  ProviderError,
  ProviderRateLimitedError,
  AppError,
  IntegrationNotConfiguredError,
} from "../../shared/errors"

export type ZernioClient = Zernio
export type ZernioAccess = () => ZernioClient

export type ZernioConfig = {
  apiKey: string
  apiUrl: string
}

export function createZernioClient(config: ZernioConfig): ZernioClient {
  if (!config.apiKey) throw new IntegrationNotConfiguredError()
  return new Zernio({ apiKey: config.apiKey, baseURL: config.apiUrl })
}

export function hasStatus(error: unknown, status: number): boolean {
  return error instanceof ZernioApiError && error.statusCode === status
}

/**
 * Turns a failed Zernio call into an application error. `action` completes the
 * sentence "Couldn't ...", for example "create the automation".
 */
export function toProviderError(action: string, error: unknown): AppError {
  if (error instanceof RateLimitError) {
    return new ProviderRateLimitedError(error)
  }

  if (error instanceof AppError) return error

  if (error instanceof ZernioApiError) {
    return new ProviderError(`Couldn't ${action}. ${error.message}`, error)
  }

  return new ProviderError(
    `Couldn't ${action}. The request did not complete.`,
    error
  )
}

/** Sends a request and returns the response body. */
export async function request<Result extends { data?: unknown }>(
  action: string,
  send: () => Promise<Result>
): Promise<NonNullable<Result["data"]>> {
  let body: Result["data"]

  try {
    body = (await send()).data
  } catch (error) {
    throw toProviderError(action, error)
  }

  if (body === undefined || body === null) {
    throw new ProviderError(`Couldn't ${action}. The response was empty.`)
  }

  return body as NonNullable<Result["data"]>
}

/**
 * Sends a delete. A 404 means the resource is already gone, which is the state
 * the caller asked for.
 */
export async function requestDeletion(
  action: string,
  send: () => Promise<unknown>
): Promise<void> {
  try {
    await send()
  } catch (error) {
    if (hasStatus(error, 404)) {
      return
    }

    throw toProviderError(action, error)
  }
}
