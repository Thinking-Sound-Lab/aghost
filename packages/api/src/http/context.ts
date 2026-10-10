import type { Context } from "hono"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@workspace/supabase/types"
import type { Services } from "../container"
import type { WorkspaceRecord } from "../modules/workspaces/workspace"

export type RequestIdentity = { services: Services; workspace: WorkspaceRecord }
export type Authenticate = (accessToken: string) => Promise<RequestIdentity>
export type HttpEnv = {
  Variables: { identity: RequestIdentity; session: SupabaseClient<Database> }
}
export type ApiContext = Context<HttpEnv>
