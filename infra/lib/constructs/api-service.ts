import { Duration, RemovalPolicy } from "aws-cdk-lib"
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2"
import { HttpAlbIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns"
import * as logs from "aws-cdk-lib/aws-logs"
import type * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import { Construct } from "constructs"
import type { ApiConfig } from "../config"

const PORT = 4000

/** Keys of the credentials secret, injected as variables of the same name. */
export const SECRET_KEYS = [
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "ZERNIO_API_KEY",
  "ZERNIO_WEBHOOK_SECRET",
] as const

export type ApiServiceProps = Pick<
  ApiConfig,
  "appUrl" | "supabaseUrl" | "zernioApiUrl" | "capacity"
> & {
  vpc: ec2.IVpc
  image: ecs.ContainerImage
  secret: secretsmanager.ISecret
}

/**
 * The Fastify API as a Fargate service. Its only public address is an API
 * Gateway HTTPS endpoint, which needs no domain or certificate of ours and
 * reaches a private load balancer through a VPC link.
 *
 * Tasks run in public subnets with public addresses for their outbound calls;
 * their security group admits traffic only from the load balancer. They run
 * on x86_64, which Fargate supports in every Availability Zone of regions
 * such as us-east-1, where ARM64 is unavailable in one of them.
 */
export class ApiService extends Construct {
  readonly service: ecsPatterns.ApplicationLoadBalancedFargateService
  /** The API's public origin, which the web app proxies /api to. */
  readonly url: string

  constructor(scope: Construct, id: string, props: ApiServiceProps) {
    super(scope, id)

    const logGroup = new logs.LogGroup(this, "Logs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "Service",
      {
        cluster: new ecs.Cluster(this, "Cluster", { vpc: props.vpc }),
        cpu: props.capacity.cpu,
        memoryLimitMiB: props.capacity.memoryMiB,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
        taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        assignPublicIp: true,
        taskImageOptions: {
          image: props.image,
          containerName: "api",
          containerPort: PORT,
          environment: {
            API_HOST: "0.0.0.0",
            API_PORT: String(PORT),
            APP_URL: props.appUrl,
            SUPABASE_URL: props.supabaseUrl,
            ZERNIO_API_URL: props.zernioApiUrl,
          },
          secrets: Object.fromEntries(
            SECRET_KEYS.map((key) => [
              key,
              ecs.Secret.fromSecretsManager(props.secret, key),
            ])
          ),
          logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: "api", logGroup }),
        },
        publicLoadBalancer: false,
        openListener: false,
        // New tasks must pass health checks before old ones stop; a release
        // that never becomes healthy is rolled back.
        minHealthyPercent: 100,
        maxHealthyPercent: 200,
        circuitBreaker: { rollback: true },
      }
    )

    this.service.targetGroup.configureHealthCheck({
      path: "/api/health",
      healthyHttpCodes: "200",
      interval: Duration.seconds(15),
      healthyThresholdCount: 2,
    })
    // Fastify finishes requests in flight when ECS stops a task.
    this.service.targetGroup.setAttribute(
      "deregistration_delay.timeout_seconds",
      "30"
    )

    this.service.service
      // Autoscaling owns the task count, so deployments never reset it.
      .autoScaleTaskCount({
        minCapacity: props.capacity.minTasks,
        maxCapacity: props.capacity.maxTasks,
      })
      .scaleOnCpuUtilization("Cpu", { targetUtilizationPercent: 60 })

    const linkSecurityGroup = new ec2.SecurityGroup(this, "LinkSecurityGroup", {
      vpc: props.vpc,
      description: "Connection from API Gateway to the API load balancer",
    })
    this.service.loadBalancer.connections.allowFrom(
      linkSecurityGroup,
      ec2.Port.tcp(80),
      "API Gateway"
    )
    const endpoint = new apigwv2.HttpApi(this, "Endpoint", {
      description: "Public HTTPS endpoint of the aghost API",
      defaultIntegration: new HttpAlbIntegration(
        "LoadBalancer",
        this.service.listener,
        {
          vpcLink: new apigwv2.VpcLink(this, "Link", {
            vpc: props.vpc,
            subnets: { subnetType: ec2.SubnetType.PUBLIC },
            securityGroups: [linkSecurityGroup],
          }),
        }
      ),
    })
    this.url = endpoint.apiEndpoint
  }
}
