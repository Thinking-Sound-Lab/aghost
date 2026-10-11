import type {
  Actor,
  Analytics,
  EventSource,
  PersonTraits,
  ProductAnalytics,
  ProductEvent,
  WorkspaceTraits,
} from "../modules/analytics/analytics"
import type { WorkspaceOwner } from "../modules/workspaces/workspace"

/** Keeps what the API records in memory, so no test reaches PostHog. */
export function recordingAnalytics() {
  const events: { source: EventSource; actor: Actor; event: ProductEvent }[] =
    []
  const workspaces: { workspace: WorkspaceOwner; traits: WorkspaceTraits }[] =
    []
  const people: { userId: string; traits: PersonTraits }[] = []
  const exceptions: { source: EventSource; error: unknown }[] = []
  const from = (source: EventSource): ProductAnalytics => ({
    capture: (actor, event) => events.push({ source, actor, event }),
    describeWorkspace: (workspace, traits) =>
      workspaces.push({ workspace, traits }),
    captureException: (error) => exceptions.push({ source, error }),
  })
  const analytics: Analytics = {
    from,
    identify: (userId, traits) => people.push({ userId, traits }),
    reportFailuresTo: () => {},
    shutdown: async () => {},
  }
  return {
    analytics,
    /** One source's recorder, for services built without the container. */
    source: from,
    events,
    workspaces,
    people,
    exceptions,
    /** The names of the events recorded for one user, in order. */
    namesFor: (userId: string) =>
      events
        .filter((entry) => entry.actor.userId === userId)
        .map((entry) => entry.event.name),
  }
}
