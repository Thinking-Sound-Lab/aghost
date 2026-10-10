import { readdirSync, readFileSync } from "node:fs"
import { join, sep } from "node:path"
import { App } from "aws-cdk-lib"
import { Match, Template } from "aws-cdk-lib/assertions"
import { describe, expect, it } from "vitest"
import { SECRET_KEYS } from "../lib/constructs/api-service"
import { ApiStack } from "../lib/stacks/api-stack"
import { config, context } from "./fixture"

const app = new App({ context })
const stack = new ApiStack(app, "Api", { env: config.env, api: config.api })
const template = Template.fromStack(stack)

/** The Docker build context the CDK staged for the API's image. */
function imageContext() {
  const assembly = app.synth()
  const manifest = JSON.parse(
    readFileSync(
      join(assembly.directory, `${stack.artifactId}.assets.json`),
      "utf8"
    )
  )
  const [image] = Object.values<{ source: { directory: string } }>(
    manifest.dockerImages
  )
  return join(assembly.directory, image!.source.directory)
}

function container() {
  const [definition] = Object.values(
    template.findResources("AWS::ECS::TaskDefinition")
  )
  return definition!.Properties.ContainerDefinitions[0]
}

describe("API stack", () => {
  it("runs the API on x86_64 Fargate tasks in the default VPC", () => {
    template.hasResourceProperties("AWS::ECS::TaskDefinition", {
      RequiresCompatibilities: ["FARGATE"],
      RuntimePlatform: {
        CpuArchitecture: "X86_64",
        OperatingSystemFamily: "LINUX",
      },
    })
    template.hasResourceProperties("AWS::ECS::Service", {
      LaunchType: "FARGATE",
      // Autoscaling owns the count; a deployment must not reset it.
      DesiredCount: Match.absent(),
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

  it("opens nothing to the internet but the API Gateway endpoint", () => {
    const groups = Object.values(
      template.findResources("AWS::EC2::SecurityGroup")
    ).map((group) => group.Properties)
    expect(groups.flatMap((group) => group.SecurityGroupIngress ?? [])).toEqual(
      []
    )

    const ingress = Object.values(
      template.findResources("AWS::EC2::SecurityGroupIngress")
    ).map(({ Properties: rule }) => ({
      port: rule.FromPort,
      from: rule.SourceSecurityGroupId["Fn::GetAtt"][0],
    }))
    // API Gateway reaches the load balancer, which alone reaches the tasks.
    expect(ingress).toEqual(
      expect.arrayContaining([
        { port: 80, from: expect.stringMatching(/LinkSecurityGroup/) },
        { port: 4000, from: expect.stringMatching(/LBSecurityGroup/) },
      ])
    )
    expect(ingress).toHaveLength(2)
    template.hasResourceProperties(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      { Scheme: "internal" }
    )
  })

  it("injects credentials from Secrets Manager and never as plain variables", () => {
    const { Environment, Secrets } = container()
    const plain = Environment.map((variable: { Name: string }) => variable.Name)
    expect(plain.sort()).toEqual([
      "API_HOST",
      "API_PORT",
      "APP_URL",
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

  it("serves HTTPS from API Gateway without a domain of its own", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      ProtocolType: "HTTP",
    })
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$default",
    })
    template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
      IntegrationType: "HTTP_PROXY",
      ConnectionType: "VPC_LINK",
    })
    template.hasOutput("ApiUrl", {})
    template.resourceCountIs("AWS::Route53::RecordSet", 0)
    template.resourceCountIs("AWS::CertificateManager::Certificate", 0)
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

  it("builds the image from the server's workspace packages only", () => {
    const context = imageContext()
    const files = readdirSync(context, { recursive: true }).map(String)
    expect(files).toContain(join("full", "apps", "server", "src", "index.ts"))
    // A web-only change cannot alter the image or redeploy the service.
    expect(files.filter((file) => file.split(sep).includes("web"))).toEqual([])
    // Neither the web app's importer nor Next.js is in the pruned lockfile.
    expect(readFileSync(join(context, "pnpm-lock.yaml"), "utf8")).not.toMatch(
      /^ {2}(apps\/web:|next@)/m
    )
  })

  it("keeps the API's logs for a month", () => {
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 30,
    })
  })
})
