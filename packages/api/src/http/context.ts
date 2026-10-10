import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@workspace/supabase/types"
import type { Services } from "../container"
import type { WorkspaceRecord } from "../modules/workspaces/workspace"

export type RequestIdentity = { services: Services; workspace: WorkspaceRecord }
export type Authenticate = (accessToken: string) => Promise<RequestIdentity>

declare module "fastify" {
  interface FastifyRequest {
    /** Supabase client bound to this request's session cookies. */
    session: SupabaseClient<Database>
    /** The signed-in user's workspace and services, on protected routes. */
    identity: RequestIdentity
  }
}
