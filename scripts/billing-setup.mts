// Explicit ESM keeps top-level await working with the root package's loader.
import { ensureRootEnv } from "./local-env.mjs"
import { loadApiConfig } from "../packages/api/src/config"
import { createDodoClient } from "../packages/api/src/infrastructure/dodo/dodo-client"
import {
  loadCatalog,
  syncCatalog,
} from "../packages/api/src/infrastructure/dodo/dodo-catalog"

const config = loadApiConfig({ ...process.env, ...ensureRootEnv() })
const client = createDodoClient(config.dodo)
console.log(
  `Setting up the six plan products in Dodo ${config.dodo.environment}...`
)
await syncCatalog(client, console.log)
await loadCatalog(client)
console.log(
  "All plans match the USD base prices, with no localized prices. Prices include tax."
)
