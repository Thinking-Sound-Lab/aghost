import { App } from "aws-cdk-lib"
import { Match, Template } from "aws-cdk-lib/assertions"
import { describe, it } from "vitest"
import { GitHubDeployStack } from "../lib/stacks/github-deploy-stack"
import { config } from "./fixture"

const template = Template.fromStack(
  new GitHubDeployStack(new App(), "GitHubDeploy", {
    env: config.env,
    ...config.github,
  })
)

describe("GitHub deploy stack", () => {
  it("trusts only the repository's prod environment", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: "sts:AssumeRoleWithWebIdentity",
            Principal: {
              Federated: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    { Ref: "AWS::Partition" },
                    ":iam::123456789012:oidc-provider/token.actions.githubusercontent.com",
                  ],
                ],
              },
            },
            Condition: {
              StringEquals: {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                "token.actions.githubusercontent.com:sub":
                  "repo:Thinking-Sound-Lab@230501294/aghost@1412704218:environment:prod",
              },
            },
          }),
        ],
      },
    })
  })

  it("can only assume the roles created by cdk bootstrap", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Action: "sts:AssumeRole",
            Resource: Match.anyValue(),
            Condition: {
              StringEquals: {
                "iam:ResourceTag/aws-cdk:bootstrap-role": [
                  "deploy",
                  "file-publishing",
                  "image-publishing",
                  "lookup",
                ],
              },
            },
          },
        ],
      },
    })
  })
})
