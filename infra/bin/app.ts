import { App, Tags } from "aws-cdk-lib"
import { loadStageConfig } from "../lib/config"
import { ApiStack } from "../lib/stacks/api-stack"
import { GitHubDeployStack } from "../lib/stacks/github-deploy-stack"

const config = loadStageConfig(process.env)
const app = new App()
// The tags that tell this product apart from the others in the account, on
// each stack and on every resource in it.
const tags = { Project: "Aghost", Environment: config.stage }
for (const [key, value] of Object.entries(tags)) Tags.of(app).add(key, value)

new GitHubDeployStack(app, `Aghost-${config.stage}-GitHubDeploy`, {
  env: config.env,
  tags,
  ...config.github,
})

new ApiStack(app, `Aghost-${config.stage}-Api`, {
  env: config.env,
  tags,
  api: config.api,
})
