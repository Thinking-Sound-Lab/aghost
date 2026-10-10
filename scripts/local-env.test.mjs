import assert from "node:assert/strict"
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import {
  ensureRootEnv,
  fillRootEnv,
  readRootEnv,
  webEnvironment,
  writeRootEnv,
} from "./local-env.mjs"

function workspace(t) {
  const directory = mkdtempSync(join(tmpdir(), "aghost-env-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  writeFileSync(
    join(directory, ".env.example"),
    "API_URL=http://127.0.0.1:4000\nAPI_HOST=0.0.0.0\nZERNIO_API_KEY=\nSUPABASE_SECRET_KEY=\n"
  )
  return directory
}

test("setup creates a private root .env from the template", (t) => {
  const directory = workspace(t)
  const env = ensureRootEnv(directory)
  assert.equal(env.API_HOST, "0.0.0.0")
  assert.equal(env.ZERNIO_API_KEY, "")
  assert.equal(statSync(join(directory, ".env")).mode & 0o777, 0o600)
})

test("setup keeps user-edited root values and fills empty database credentials", (t) => {
  const directory = workspace(t)
  writeFileSync(
    join(directory, ".env"),
    "ZERNIO_API_KEY=root-key\nSUPABASE_SECRET_KEY=\n"
  )
  ensureRootEnv(directory)
  fillRootEnv(
    {
      ZERNIO_API_KEY: "replacement",
      SUPABASE_SECRET_KEY: "local-database-key",
    },
    directory
  )
  assert.equal(readRootEnv(directory).ZERNIO_API_KEY, "root-key")
  assert.equal(readRootEnv(directory).SUPABASE_SECRET_KEY, "local-database-key")
  assert.match(
    readFileSync(join(directory, ".env"), "utf8"),
    /^SUPABASE_SECRET_KEY=local-database-key$/m
  )
})

test("setup adds variables the template gained without touching existing ones", (t) => {
  const directory = workspace(t)
  writeFileSync(join(directory, ".env"), "ZERNIO_API_KEY=root-key\n")
  const env = ensureRootEnv(directory)
  assert.equal(env.ZERNIO_API_KEY, "root-key")
  assert.equal(env.API_HOST, "0.0.0.0")
  assert.equal(env.SUPABASE_SECRET_KEY, "")
  assert.equal(statSync(join(directory, ".env")).mode & 0o777, 0o600)
})

test("a value written on purpose replaces the existing one", (t) => {
  const directory = workspace(t)
  writeFileSync(join(directory, ".env"), "ZERNIO_API_KEY=old\n")
  writeRootEnv({ ZERNIO_API_KEY: "new" }, directory)
  assert.equal(readRootEnv(directory).ZERNIO_API_KEY, "new")
})

test("values that need quoting survive a round trip", (t) => {
  const directory = workspace(t)
  ensureRootEnv(directory)
  fillRootEnv({ SUPABASE_SECRET_KEY: "literal$secret#value " }, directory)
  assert.equal(
    readRootEnv(directory).SUPABASE_SECRET_KEY,
    "literal$secret#value "
  )
})

test("the web process receives API_URL without backend credentials", () => {
  const env = webEnvironment(
    {
      API_URL: "http://127.0.0.1:4000",
      ZERNIO_API_KEY: "root-secret",
      SUPABASE_SECRET_KEY: "root-db-secret",
      DODO_PAYMENTS_API_KEY: "root-billing-secret",
    },
    {
      PATH: "/usr/bin",
      ZERNIO_API_KEY: "inherited-secret",
      DODO_PAYMENTS_WEBHOOK_KEY: "inherited-billing-secret",
      SUPABASE_SECRET_KEY: "inherited-db-secret",
      NEXT_PUBLIC_SUPABASE_URL: "forbidden",
    }
  )
  assert.deepEqual(env, { PATH: "/usr/bin", API_URL: "http://127.0.0.1:4000" })
  assert.equal(
    webEnvironment({}, { API_URL: "http://api:4000" }).API_URL,
    "http://api:4000"
  )
})
