import { setupLocal } from "./setup-local.mjs"
import { run } from "./local-command.mjs"

await setupLocal()
await run("pnpm", ["--filter", "web", "dev", ...process.argv.slice(2)])
