import { startSupabase } from "./setup-local.mjs"

// For CI's fresh runners. The tests run the API in-process against Postgres,
// Auth, and Supabase's REST gateway; the dashboard and mailbox are not needed.
// A stack that is already running keeps the containers it has.
await startSupabase(["studio", "postgres-meta", "mailpit"])
console.log("Supabase is ready for pnpm test. Configuration: root .env.")
