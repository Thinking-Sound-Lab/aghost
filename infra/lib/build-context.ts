import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url))

/**
 * A Docker build context with one workspace package and the packages it
 * depends on, from `turbo prune --docker`. The CDK hashes the context, so the
 * image and the service it runs change only when that code or its
 * dependencies do.
 */
export function prunedBuildContext(workspace: string): string {
  const directory = mkdtempSync(join(tmpdir(), `aghost-${workspace}-`))
  // Synthesis stages its own copy of the context before the process exits.
  process.once("exit", () =>
    rmSync(directory, { recursive: true, force: true })
  )
  execFileSync(
    "pnpm",
    ["exec", "turbo", "prune", workspace, "--docker", "--out-dir", directory],
    { cwd: REPOSITORY_ROOT, stdio: ["ignore", "ignore", "inherit"] }
  )
  return directory
}
