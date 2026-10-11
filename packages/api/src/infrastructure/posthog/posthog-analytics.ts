import { PostHog } from "posthog-node"

import type {
  Actor,
  Analytics,
  EventSource,
  PersonTraits,
  ProductAnalytics,
} from "../../modules/analytics/analytics"

/** PostHog's group type for workspaces, used by group analytics. */
const WORKSPACE = "workspace"

/**
 * Sends events to a PostHog project. The client queues them and sends them in
 * batches, so recording an event never waits on PostHog.
 */
export class PostHogAnalytics implements Analytics {
  private readonly client: PostHog

  constructor(config: { projectKey: string; host: string }) {
    this.client = new PostHog(config.projectKey, { host: config.host })
  }

  from(source: EventSource): ProductAnalytics {
    const client = this.client
    return {
      capture: (actor, { name, ...properties }) =>
        client.capture({
          distinctId: actor.userId,
          event: name,
          properties: { ...properties, source },
          groups: groupsOf(actor),
        }),
      describeWorkspace: (workspace, traits) => {
        client.groupIdentify({
          groupType: WORKSPACE,
          groupKey: workspace.id,
          properties: traits,
          distinctId: workspace.ownerId,
        })
        client.setPersonProperties({
          distinctId: workspace.ownerId,
          properties: traits,
        })
      },
      captureException: (error, actor, context) =>
        client.captureException(error, actor?.userId, {
          ...context,
          source,
          ...(actor?.workspaceId && { $groups: groupsOf(actor) }),
        }),
    }
  }

  identify(userId: string, { signed_up_at, ...traits }: PersonTraits): void {
    this.client.identify({
      distinctId: userId,
      properties: { $set: traits, $set_once: { signed_up_at } },
    })
  }

  reportFailuresTo(report: (error: unknown) => void): void {
    this.client.on("error", report)
  }

  shutdown(): Promise<void> {
    return this.client.shutdown()
  }
}

function groupsOf(actor: Actor): Record<string, string> | undefined {
  return actor.workspaceId ? { [WORKSPACE]: actor.workspaceId } : undefined
}
