import { parseEnvironment } from "@workspace/env"
import { z } from "zod"

/**
 * The repository whose GitHub Actions workflows may deploy. Its OIDC subjects
 * name it with its owner's and its own numeric IDs, which a deleted and
 * recreated repository of the same name would not have.
 */
const GITHUB_REPOSITORY = {
  name: "Thinking-Sound-Lab/aghost",
  subject: "repo:Thinking-Sound-Lab@230501294/aghost@1412704218",
}
const ZERNIO_API_URL = "https://zernio.com/api"
// PostHog's US cloud; use https://eu.i.posthog.com for a project in the EU.
const POSTHOG_HOST = "https://us.i.posthog.com"

const environmentSchema = z.object({
  STAGE: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, "Use a lowercase name such as prod"),
  AWS_ACCOUNT_ID: z.string().regex(/^\d{12}$/, "Use the 12-digit account ID"),
  AWS_REGION: z.string().min(1),
  APP_URL: z.url(),
  SUPABASE_URL: z.url(),
  // Public by design. Unset, as in local cdk commands, leaves analytics off.
  POSTHOG_KEY: z.string().default(""),
})

export type ApiConfig = {
  /** Origin of the web app on Vercel. */
  appUrl: string
  supabaseUrl: string
  zernioApiUrl: string
  /** The PostHog project that receives product events. */
  posthog: { key: string; host: string }
  /** Secrets Manager secret with the API's credentials, created once by hand. */
  secretName: string
  capacity: {
    cpu: number
    memoryMiB: number
    minTasks: number
    maxTasks: number
  }
}

export type StageConfig = {
  stage: string
  env: { account: string; region: string }
  github: {
    repository: { name: string; subject: string }
    environment: string
  }
  api: ApiConfig
}

/**
 * Reads one deployment stage from environment variables. GitHub Actions passes
 * them from the GitHub environment named after the stage. Every variable is
 * required: a missing or malformed one stops synthesis with a message that
 * names it.
 */
export function loadStageConfig(
  environment: Record<string, string | undefined>
): StageConfig {
  const env = parseEnvironment(environmentSchema, environment, "The deployment")

  return {
    stage: env.STAGE,
    env: { account: env.AWS_ACCOUNT_ID, region: env.AWS_REGION },
    github: { repository: GITHUB_REPOSITORY, environment: env.STAGE },
    api: {
      appUrl: env.APP_URL,
      supabaseUrl: env.SUPABASE_URL,
      zernioApiUrl: ZERNIO_API_URL,
      posthog: { key: env.POSTHOG_KEY, host: POSTHOG_HOST },
      secretName: `aghost/${env.STAGE}/api`,
      capacity: { cpu: 512, memoryMiB: 1024, minTasks: 2, maxTasks: 4 },
    },
  }
}
