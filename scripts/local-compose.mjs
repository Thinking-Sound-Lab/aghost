import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { readRootEnv } from "./local-env.mjs"
import { run } from "./local-command.mjs"

export function compose(args, env = readRootEnv(), options = {}) {
  // Parsed values take precedence over Compose's own .env interpolation. This
  // also keeps literal dollar signs in credentials intact.
  return run("docker", ["compose", "--file", "compose.yaml", ...args], {
    env: { ...process.env, ...env },
    ...options,
  })
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await compose(process.argv.slice(2))
}
