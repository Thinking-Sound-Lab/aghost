import type { DatabaseClient } from "@workspace/supabase/server"

/**
 * The two database connections a repository works with.
 *
 * Reads go through `scoped`, which acts as the signed-in user, so row level
 * security confines them to that user's workspace even if a query forgets to.
 * API-key requests use a backend client for reads as well: their exposed
 * operations must explicitly filter by the key's verified workspace.
 * Writes go through `privileged`: signed-in users hold no write privileges,
 * which keeps the provider pointer columns out of reach of a browser.
 */
export type DataClients = {
  scoped: DatabaseClient
  privileged: DatabaseClient
}
