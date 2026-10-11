import { backendEnvironment } from "./local-env.mjs"
import { loadApiConfig } from "../packages/api/src/config"
import { createBillingMaintenance } from "../packages/api/src/container"

const config = loadApiConfig(backendEnvironment())
console.log(
  `Reconciling running automations against Dodo ${config.dodo.environment}...`
)
const count = await createBillingMaintenance(config).run(console.log)
console.log(`Billing policy reconciled for ${count} workspaces.`)
