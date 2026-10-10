import { parseEnvironment } from "@workspace/env"
import { z } from "zod"

const environmentSchema = z.object({
  APP_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  ZERNIO_API_URL: z.url(),
  ZERNIO_API_KEY: z.string(),
  ZERNIO_WEBHOOK_SECRET: z.string(),
  DODO_PAYMENTS_ENVIRONMENT: z
    .enum(["test_mode", "live_mode"])
    .default("test_mode"),
  DODO_PAYMENTS_API_KEY: z.string().default(""),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().default(""),
})

export type ApiConfig = {
  /** Origin of the web app, used to build the URLs the provider redirects to. */
  appUrl: string
  supabase: {
    url: string
    publishableKey: string
    secretKey: string
  }
  zernio: {
    apiUrl: string
    apiKey: string
    webhookSecret: string
  }
  dodo: {
    environment: "test_mode" | "live_mode"
    /** Empty until billing is set up, which leaves plans unavailable. */
    apiKey: string
    /** Signing secret of the webhook endpoint registered with Dodo Payments. */
    webhookKey: string
  }
}

/**
 * Reads the API's configuration from environment variables. Every variable is
 * required: a missing or malformed one stops the API with a message that names
 * it.
 */
export function loadApiConfig(
  environment: Record<string, string | undefined>
): ApiConfig {
  const env = parseEnvironment(environmentSchema, environment, "The API")

  return {
    appUrl: env.APP_URL,
    supabase: {
      url: env.SUPABASE_URL,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
      secretKey: env.SUPABASE_SECRET_KEY,
    },
    zernio: {
      apiUrl: env.ZERNIO_API_URL,
      apiKey: env.ZERNIO_API_KEY,
      webhookSecret: env.ZERNIO_WEBHOOK_SECRET,
    },
    dodo: {
      environment: env.DODO_PAYMENTS_ENVIRONMENT,
      apiKey: env.DODO_PAYMENTS_API_KEY,
      webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
    },
  }
}
