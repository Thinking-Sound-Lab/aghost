import { createServer } from "node:http"
import { once } from "node:events"
import type { AddressInfo } from "node:net"
import { gunzipSync } from "node:zlib"
import { afterEach, describe, expect, it } from "vitest"
import { loadApiConfig } from "../config"
import { PostHogAnalytics } from "../infrastructure/posthog/posthog-analytics"

type Sent = {
  event: string
  distinct_id: string
  properties: Record<string, unknown>
}

/** A local stand-in for PostHog's ingestion API that keeps what it receives. */
async function startPostHogFixture(status = 200) {
  const batches: { path: string; apiKey: string; batch: Sent[] }[] = []
  const server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on("data", (chunk: Buffer) => chunks.push(chunk))
    request.on("end", () => {
      const raw = Buffer.concat(chunks)
      const body = JSON.parse(
        String(
          request.headers["content-encoding"] === "gzip" ? gunzipSync(raw) : raw
        )
      )
      batches.push({
        path: request.url ?? "",
        apiKey: body.api_key,
        batch: body.batch,
      })
      response.writeHead(status, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ status: status === 200 ? 1 : 0 }))
    })
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const { port } = server.address() as AddressInfo
  return {
    host: `http://127.0.0.1:${port}`,
    sent: () => batches.flatMap((entry) => entry.batch),
    batches,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

describe("PostHog configuration", () => {
  const environment = {
    APP_URL: "http://localhost:3000",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PUBLISHABLE_KEY: "publishable",
    SUPABASE_SECRET_KEY: "secret",
    ZERNIO_API_URL: "https://zernio.com/api",
    ZERNIO_API_KEY: "",
    ZERNIO_WEBHOOK_SECRET: "",
  }

  it("leaves analytics off without a key, even when Compose passes a blank host", () => {
    expect(loadApiConfig(environment).posthog).toBeNull()
    expect(
      loadApiConfig({ ...environment, POSTHOG_KEY: "", POSTHOG_HOST: "" })
        .posthog
    ).toBeNull()
  })

  it("needs the host with a key, and uses both", () => {
    expect(() =>
      loadApiConfig({ ...environment, POSTHOG_KEY: "phc_1", POSTHOG_HOST: "" })
    ).toThrow(/POSTHOG_HOST/)
    expect(
      loadApiConfig({
        ...environment,
        POSTHOG_KEY: "phc_1",
        POSTHOG_HOST: "https://eu.i.posthog.com",
      }).posthog
    ).toEqual({ projectKey: "phc_1", host: "https://eu.i.posthog.com" })
  })
})

describe("PostHog analytics", () => {
  const fixtures: { close: () => Promise<unknown> }[] = []
  afterEach(async () => {
    for (const fixture of fixtures.splice(0)) await fixture.close()
  })

  it("sends events for the owner, grouped by workspace and labelled with their source", async () => {
    const posthog = await startPostHogFixture()
    fixtures.push(posthog)
    const analytics = new PostHogAnalytics({
      projectKey: "phc_fixture",
      host: posthog.host,
    })
    const workspace = { id: "workspace-1", ownerId: "user-1" }

    analytics.identify("user-1", {
      email: "maya@example.com",
      name: "Maya",
      signed_up_at: "2026-10-11T00:00:00Z",
    })
    analytics
      .from("mcp")
      .capture(
        { userId: "user-1", workspaceId: "workspace-1" },
        { name: "automation_activated", automation_id: "automation-1" }
      )
    analytics.from("webhook").describeWorkspace(workspace, { plan: "growth" })
    await analytics.shutdown()

    expect(posthog.batches.map((entry) => [entry.path, entry.apiKey])).toEqual(
      posthog.batches.map(() => ["/batch/", "phc_fixture"])
    )
    const sent = posthog.sent()
    expect(sent.find((event) => event.event === "$identify")).toMatchObject({
      distinct_id: "user-1",
      properties: {
        $set: { email: "maya@example.com", name: "Maya" },
        $set_once: { signed_up_at: "2026-10-11T00:00:00Z" },
      },
    })
    expect(
      sent.find((event) => event.event === "automation_activated")
    ).toMatchObject({
      distinct_id: "user-1",
      properties: {
        automation_id: "automation-1",
        source: "mcp",
        $groups: { workspace: "workspace-1" },
      },
    })
    expect(
      sent.find((event) => event.event === "$groupidentify")
    ).toMatchObject({
      properties: {
        $group_type: "workspace",
        $group_key: "workspace-1",
        $group_set: { plan: "growth" },
      },
    })
    expect(sent.find((event) => event.event === "$set")).toMatchObject({
      distinct_id: "user-1",
      properties: { $set: { plan: "growth" } },
    })
    // The API's address is not the visitor's, so it never sets a location.
    expect(
      sent.every((event) => event.properties.$geoip_disable === true)
    ).toBe(true)
  })

  it("reports a refused delivery instead of failing the caller", async () => {
    const posthog = await startPostHogFixture(401)
    fixtures.push(posthog)
    const analytics = new PostHogAnalytics({
      projectKey: "phc_wrong",
      host: posthog.host,
    })
    const failures: unknown[] = []
    analytics.reportFailuresTo((error) => failures.push(error))

    expect(() =>
      analytics
        .from("dashboard")
        .capture({ userId: "user-1" }, { name: "workspace_renamed" })
    ).not.toThrow()
    await analytics.shutdown()

    expect(posthog.batches).toHaveLength(1)
    expect(failures.length).toBeGreaterThan(0)
  })
})
