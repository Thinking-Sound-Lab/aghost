import { loadStageConfig } from "../lib/config"

export const environment = {
  STAGE: "prod",
  AWS_ACCOUNT_ID: "123456789012",
  AWS_REGION: "us-east-1",
  APP_URL: "https://aghost.example.com",
  SUPABASE_URL: "https://project.supabase.co",
}

export const config = loadStageConfig(environment)

const { account, region } = config.env

/**
 * Context for test apps: the default VPC as `cdk deploy` finds it, so tests
 * synthesize offline, and the template validation that cdk.json turns on.
 */
export const context = {
  "@aws-cdk/core:validateAgainstDefaultRules": true,
  [`vpc-provider:account=${account}:filter.isDefault=true:region=${region}:returnAsymmetricSubnets=true`]:
    {
      vpcId: "vpc-0a1b2c3d4e5f60718",
      vpcCidrBlock: "172.31.0.0/16",
      availabilityZones: [],
      subnetGroups: [
        {
          name: "Public",
          type: "Public",
          subnets: [
            {
              subnetId: "subnet-0a1b2c3d4e5f60718",
              availabilityZone: `${region}a`,
              routeTableId: "rtb-0a1b2c3d4e5f60718",
              cidr: "172.31.0.0/20",
            },
            {
              subnetId: "subnet-1a2b3c4d5e6f70819",
              availabilityZone: `${region}b`,
              routeTableId: "rtb-0a1b2c3d4e5f60718",
              cidr: "172.31.16.0/20",
            },
          ],
        },
      ],
    },
}
