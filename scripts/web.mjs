import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { root, readRootEnv, webEnvironment } from "./local-env.mjs"
import { run } from "./local-command.mjs"

const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url)
)
const values = existsSync(join(root, ".env")) ? readRootEnv() : {}
await run(
  process.execPath,
  [require.resolve("next/dist/bin/next"), ...process.argv.slice(2)],
  {
    cwd: join(root, "apps/web"),
    env: webEnvironment(values),
  }
)
