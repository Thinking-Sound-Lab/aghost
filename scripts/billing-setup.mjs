import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { run } from "./local-command.mjs"

const require = createRequire(
  new URL("../apps/server/package.json", import.meta.url)
)
await run(process.execPath, [
  "--import",
  require.resolve("tsx"),
  fileURLToPath(new URL("./billing-setup.mts", import.meta.url)),
])
