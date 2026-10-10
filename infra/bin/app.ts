import { App, Tags } from "aws-cdk-lib"
import { loadStageConfig } from "../lib/config"
import { ApiStack } from "../lib/stacks/api-stack"
import { GitHubDeployStack } from "../lib/stacks/github-deploy-stack"

const config = loadStageConfig(process.env)
const app = new App()
// The tags that tell this product apart from the others in the account.
Tags.of(app).add("Project", "Aghost")
Tags.of(app).add("Environment", config.stage)

new GitHubDeployStack(app, `Aghost-${config.stage}-GitHubDeploy`, {
  env: config.env,
  ...config.github,
})

new ApiStack(app, `Aghost-${config.stage}-Api`, {
  env: config.env,
  api: config.api,
})
