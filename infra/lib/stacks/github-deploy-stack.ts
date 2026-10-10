import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import type { Construct } from "constructs"

const ISSUER = "token.actions.githubusercontent.com"

export type GitHubDeployStackProps = StackProps & {
  /** owner/name of the repository whose workflows may deploy. */
  repository: string
  /** The GitHub environment the deploy job runs in. */
  environment: string
}

/**
 * Lets GitHub Actions deploy without stored AWS keys. Deployed once by an
 * administrator; the role it creates can only hand work to the roles that
 * `cdk bootstrap` created, which CloudFormation then uses.
 *
 * An account has one GitHub OIDC provider, shared by every role that trusts
 * GitHub, so it is referenced here rather than owned by this stack.
 */
export class GitHubDeployStack extends Stack {
  readonly role: iam.Role

  constructor(scope: Construct, id: string, props: GitHubDeployStackProps) {
    super(scope, id, { terminationProtection: true, ...props })

    const provider = iam.OidcProviderNative.fromOidcProviderArn(
      this,
      "GitHub",
      `arn:${this.partition}:iam::${this.account}:oidc-provider/${ISSUER}`
    )

    this.role = new iam.Role(this, "DeployRole", {
      description: `Deploys ${props.repository} from its ${props.environment} GitHub environment`,
      assumedBy: new iam.WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          [`${ISSUER}:aud`]: "sts.amazonaws.com",
          [`${ISSUER}:sub`]: `repo:${props.repository}:environment:${props.environment}`,
        },
      }),
      maxSessionDuration: Duration.hours(1),
    })
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`arn:${this.partition}:iam::${this.account}:role/cdk-*`],
        conditions: {
          StringEquals: {
            "iam:ResourceTag/aws-cdk:bootstrap-role": [
              "deploy",
              "file-publishing",
              "image-publishing",
              // Read-only; finds the default VPC during synthesis.
              "lookup",
            ],
          },
        },
      })
    )

    new CfnOutput(this, "DeployRoleArn", {
      description: "Set this as AWS_DEPLOY_ROLE_ARN in the GitHub environment.",
      value: this.role.roleArn,
    })
  }
}
