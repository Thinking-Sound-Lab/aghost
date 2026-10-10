import { loadStageConfig } from "../lib/config"

export const environment = {
  STAGE: "production",
  AWS_ACCOUNT_ID: "123456789012",
  AWS_REGION: "us-east-1",
  APP_URL: "https://aghost.example.com",
  API_DOMAIN_NAME: "api.aghost.example.com",
  HOSTED_ZONE_ID: "Z0000000000000000000",
  HOSTED_ZONE_NAME: "aghost.example.com",
  SUPABASE_URL: "https://project.supabase.co",
}

export const config = loadStageConfig(environment)

const { account, region } = config.env

/** The default VPC as `cdk deploy` finds it, so tests synthesize offline. */
export const lookups = {
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
