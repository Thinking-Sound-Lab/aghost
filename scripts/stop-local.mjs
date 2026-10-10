import { compose } from "./local-compose.mjs"
import { run } from "./local-command.mjs"

// The profile includes the tunnel, which a plain down leaves running.
await compose(["--profile", "tunnel", "down"])
await run("pnpm", ["exec", "supabase", "stop"])
console.log(
  "Local API, tunnel, and Supabase stopped. Database data was preserved."
)
