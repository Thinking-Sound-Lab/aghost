import posthog from "posthog-js"

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

/** PostHog, when this build has a project key. Without one, analytics is off. */
export const analytics = key ? posthog : null

/** Starts PostHog before the app hydrates; see instrumentation-client.ts. */
export function startAnalytics() {
  if (!key) return
  if (!host) throw new Error("Set POSTHOG_HOST with POSTHOG_KEY.")
  posthog.init(key, {
    // next.config.ts forwards this same-origin path to PostHog, so ad
    // blockers that know PostHog's addresses do not drop the events.
    api_host: "/relay",
    // The PostHog app of the project's region, for the toolbar.
    ui_host: host.replace(".i.posthog.com", ".posthog.com"),
    defaults: "2026-08-30",
    person_profiles: "identified_only",
    capture_exceptions: true,
    capture_heatmaps: true,
    capture_dead_clicks: true,
    capture_performance: { web_vitals: true, network_timing: true },
  })
}
