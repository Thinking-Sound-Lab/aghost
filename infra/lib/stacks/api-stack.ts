import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import { Platform } from "aws-cdk-lib/aws-ecr-assets"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as route53 from "aws-cdk-lib/aws-route53"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import type { Construct } from "constructs"
import { prunedBuildContext } from "../build-context"
import type { ApiConfig } from "../config"
import { ApiService } from "../constructs/api-service"

export type ApiStackProps = StackProps & { api: ApiConfig }

/** Everything the API needs in AWS for one stage, in the account's default VPC. */
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)
    const { api } = props

    new ApiService(this, "Api", {
      ...api,
      vpc: ec2.Vpc.fromLookup(this, "Vpc", { isDefault: true }),
      image: ecs.ContainerImage.fromAsset(prunedBuildContext("server"), {
        file: "full/apps/server/Dockerfile",
        platform: Platform.LINUX_AMD64,
      }),
      hostedZone: route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
        hostedZoneId: api.hostedZone.id,
        zoneName: api.hostedZone.name,
      }),
      secret: secretsmanager.Secret.fromSecretNameV2(
        this,
        "Credentials",
        api.secretName
      ),
    })

    new CfnOutput(this, "ApiUrl", {
      description: "Set this as API_URL in the Vercel project.",
      value: `https://${api.domainName}`,
    })
  }
}
