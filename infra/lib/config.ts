import { parseEnvironment } from "@workspace/env"
import { z } from "zod"

/** The repository whose GitHub Actions workflows may deploy. */
const GITHUB_REPOSITORY = "Thinking-Sound-Lab/aghost"
const ZERNIO_API_URL = "https://zernio.com/api"

const environmentSchema = z.object({
  STAGE: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, "Use a lowercase name such as production"),
  AWS_ACCOUNT_ID: z.string().regex(/^\d{12}$/, "Use the 12-digit account ID"),
  AWS_REGION: z.string().min(1),
  APP_URL: z.url(),
  API_DOMAIN_NAME: z.string().min(1),
  HOSTED_ZONE_ID: z.string().min(1),
  HOSTED_ZONE_NAME: z.string().min(1),
  SUPABASE_URL: z.url(),
})

export type ApiConfig = {
  /** Public hostname of the API, served by the load balancer. */
  domainName: string
  /** Route 53 zone that holds the API's record and certificate validation. */
  hostedZone: { id: string; name: string }
  /** Origin of the web app on Vercel. */
  appUrl: string
  supabaseUrl: string
  zernioApiUrl: string
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
  github: { repository: string; environment: string }
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
      domainName: env.API_DOMAIN_NAME,
      hostedZone: { id: env.HOSTED_ZONE_ID, name: env.HOSTED_ZONE_NAME },
      appUrl: env.APP_URL,
      supabaseUrl: env.SUPABASE_URL,
      zernioApiUrl: ZERNIO_API_URL,
      secretName: `aghost/${env.STAGE}/api`,
      capacity: { cpu: 512, memoryMiB: 1024, minTasks: 2, maxTasks: 4 },
    },
  }
}
