import {
  chmodSync,
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"

export const root = fileURLToPath(new URL("../", import.meta.url))

export function readRootEnv(directory = root) {
  return parseEnv(readFileSync(join(directory, ".env"), "utf8"))
}

function assignment(name, value) {
  // Check round-trip parsing before writing a credential with special characters.
  const candidates = [value, JSON.stringify(value)]
  if (!value.includes("'")) candidates.push(`'${value}'`)
  for (const encoded of candidates) {
    const line = `${name}=${encoded}`
    if (parseEnv(line)[name] === value) return line
  }
  throw new Error(`Could not safely write ${name} to the root .env.`)
}

function setValue(contents, name, value) {
  const line = assignment(name, value)
  const definition = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=.*$`, "m")
  if (definition.test(contents)) return contents.replace(definition, () => line)
  return `${contents}${contents.endsWith("\n") ? "" : "\n"}${line}\n`
}

/** Creates the root .env from the template once; existing values are kept. */
export function ensureRootEnv(directory = root) {
  const file = join(directory, ".env")
  if (!existsSync(file)) {
    copyFileSync(join(directory, ".env.example"), file)
    chmodSync(file, 0o600)
  }
  return readRootEnv(directory)
}

/** Fills only empty values, so user-edited settings are never replaced. */
export function fillRootEnv(values, directory = root) {
  const file = join(directory, ".env")
  let contents = readFileSync(file, "utf8")
  const current = parseEnv(contents)
  for (const [key, value] of Object.entries(values)) {
    if (!current[key]) contents = setValue(contents, key, value)
  }
  writeFileSync(file, contents, { mode: 0o600 })
  chmodSync(file, 0o600)
  return parseEnv(contents)
}

/** Root backend secrets are never assigned to the frontend process. */
export function webEnvironment(values, inherited = process.env) {
  const environment = { ...inherited }
  for (const name of Object.keys(environment)) {
    if (/^(?:SUPABASE_|ZERNIO_|NEXT_PUBLIC_SUPABASE_)/.test(name))
      delete environment[name]
  }
  const apiUrl = values.API_URL ?? inherited.API_URL
  if (!apiUrl)
    throw new Error("Set API_URL in the root .env or deployment environment.")
  environment.API_URL = apiUrl
  return environment
}
