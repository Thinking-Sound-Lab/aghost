import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "@workspace/supabase/types"
import type { Services } from "../container"
import type { WorkspaceRecord } from "../modules/workspaces/workspace"
import type { ApiKey } from "../contract/api-key"

export type RequestIdentity = { services: Services; workspace: WorkspaceRecord }
export type Authenticate = (accessToken: string) => Promise<RequestIdentity>
export type AgentIdentity = RequestIdentity & { apiKey: ApiKey }
/** How the agent reached the API: REST or MCP. */
export type AgentSource = "api" | "mcp"
export type AuthenticateAgent = (
  token: string,
  source: AgentSource
) => Promise<AgentIdentity>

declare module "fastify" {
  interface FastifyRequest {
    /** Supabase client bound to this request's session cookies. */
    session: SupabaseClient<Database>
    /** The signed-in user's workspace and services, on protected routes. */
    identity: RequestIdentity
    /** The signed-in user, on protected routes. */
    user: User
    agentIdentity: AgentIdentity
  }

  interface FastifyContextConfig {
    /** These routes require an API key, never a browser session. */
    agent?: boolean
    /** Reachable without a plan, so that a workspace can subscribe. */
    withoutPlan?: boolean
  }
}
