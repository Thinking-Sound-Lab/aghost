import { App } from "aws-cdk-lib"
import { Match, Template } from "aws-cdk-lib/assertions"
import { describe, expect, it } from "vitest"
import { SECRET_KEYS } from "../lib/constructs/api-service"
import { ApiStack } from "../lib/stacks/api-stack"
import { config, lookups } from "./fixture"

const template = Template.fromStack(
  new ApiStack(new App({ context: lookups }), "Api", {
    env: config.env,
    api: config.api,
  })
)

function container() {
  const [definition] = Object.values(
    template.findResources("AWS::ECS::TaskDefinition")
  )
  return definition!.Properties.ContainerDefinitions[0]
}

describe("API stack", () => {
  it("runs the API on Graviton Fargate tasks in the default VPC", () => {
    template.hasResourceProperties("AWS::ECS::TaskDefinition", {
      RequiresCompatibilities: ["FARGATE"],
      RuntimePlatform: {
        CpuArchitecture: "ARM64",
        OperatingSystemFamily: "LINUX",
      },
    })
    template.hasResourceProperties("AWS::ECS::Service", {
      LaunchType: "FARGATE",
      DesiredCount: 2,
      NetworkConfiguration: {
        AwsvpcConfiguration: Match.objectLike({
          AssignPublicIp: "ENABLED",
          Subnets: ["subnet-0a1b2c3d4e5f60718", "subnet-1a2b3c4d5e6f70819"],
        }),
      },
    })
    expect(container().PortMappings).toEqual([
      { ContainerPort: 4000, Protocol: "tcp" },
    ])
  })

  it("admits traffic to the tasks only from the load balancer", () => {
    const rules = Object.values(
      template.findResources("AWS::EC2::SecurityGroupIngress")
    ).map((rule) => rule.Properties)
    expect(rules).toEqual([
      expect.objectContaining({
        IpProtocol: "tcp",
        FromPort: 4000,
        ToPort: 4000,
        SourceSecurityGroupId: {
          "Fn::GetAtt": [expect.stringMatching(/LB.*SecurityGroup/), "GroupId"],
        },
      }),
    ])
    const groups = Object.values(
      template.findResources("AWS::EC2::SecurityGroup")
    ).map((group) => group.Properties)
    const open = groups.filter((group) =>
      group.SecurityGroupIngress?.some(
        (rule: { CidrIp?: string }) => rule.CidrIp === "0.0.0.0/0"
      )
    )
    // Only the load balancer accepts traffic from the internet.
    expect(open).toHaveLength(1)
    expect(
      open[0].SecurityGroupIngress.map(
        (rule: { FromPort: number }) => rule.FromPort
      )
    ).toEqual([443, 80])
  })

  it("injects credentials from Secrets Manager and never as plain variables", () => {
    const { Environment, Secrets } = container()
    const plain = Environment.map((variable: { Name: string }) => variable.Name)
    expect(plain.sort()).toEqual([
      "API_HOST",
      "API_PORT",
      "APP_URL",
      "NODE_ENV",
      "SUPABASE_URL",
      "ZERNIO_API_URL",
    ])
    expect(Secrets.map((secret: { Name: string }) => secret.Name)).toEqual([
      ...SECRET_KEYS,
    ])
    expect(Environment).toContainEqual({
      Name: "APP_URL",
      Value: "https://aghost.example.com",
    })
  })

  it("serves HTTPS on the API domain and redirects HTTP", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 443,
      Protocol: "HTTPS",
      SslPolicy: "ELBSecurityPolicy-TLS13-1-2-2021-06",
    })
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
      DefaultActions: [
        Match.objectLike({
          Type: "redirect",
          RedirectConfig: Match.objectLike({ Protocol: "HTTPS", Port: "443" }),
        }),
      ],
    })
    template.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: "api.aghost.example.com",
      ValidationMethod: "DNS",
    })
    template.hasResourceProperties("AWS::Route53::RecordSet", {
      Name: "api.aghost.example.com.",
      Type: "A",
      HostedZoneId: "Z0000000000000000000",
    })
  })

  it("replaces tasks only after health checks pass and rolls back a failed release", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckPath: "/api/health",
      Matcher: { HttpCode: "200" },
      TargetGroupAttributes: Match.arrayWith([
        { Key: "deregistration_delay.timeout_seconds", Value: "30" },
      ]),
    })
    template.hasResourceProperties("AWS::ECS::Service", {
      DeploymentConfiguration: Match.objectLike({
        MinimumHealthyPercent: 100,
        DeploymentCircuitBreaker: { Enable: true, Rollback: true },
      }),
    })
    template.hasResourceProperties(
      "AWS::ApplicationAutoScaling::ScalableTarget",
      { MinCapacity: 2, MaxCapacity: 4 }
    )
  })

  it("keeps the API's logs for a month", () => {
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 30,
    })
  })
})
