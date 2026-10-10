import { readFileSync } from "node:fs"

const template = readFileSync(
  new URL("./skills/aghost/SKILL.md", import.meta.url),
  "utf8"
)

/** Public setup instructions contain the configured app URL, never credentials. */
export function agentSkill(appUrl: string): string {
  return template.replaceAll("{{AGHOST_APP_URL}}", new URL(appUrl).origin)
}
