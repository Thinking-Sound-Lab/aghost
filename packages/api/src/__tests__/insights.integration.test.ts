import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createAdminSupabaseClient } from "@workspace/supabase/server"
import { createApi } from "../container"
import { loadApiConfig } from "../config"
import type { ApiApp } from "../http/app"
import type { InstagramAccount } from "../contract/account"
import type {
  InsightReport,
  InsightPostReport,
  InsightTimingReport,
} from "../contract/insights"
import {
  grantPlan,
  signInDisposableUser,
  workspaceIdOf,
} from "./session-fixture"
import { startZernioFixture } from "./zernio-fixture"

const config = {
  ...loadApiConfig(
    parseEnv(readFileSync(new URL("../../../../.env", import.meta.url), "utf8"))
  ),
  posthog: null,
}
if (!["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname))
  throw new Error("Insight integration tests may only use local Supabase.")
const admin = createAdminSupabaseClient(config.supabase)

describe("Instagram analytics HTTP lifecycle", () => {
  let fixture: Awaited<ReturnType<typeof startZernioFixture>>
  let app: ApiApp
  let account: InstagramAccount
  const users: string[] = []
  const cookies: string[] = []
  const get = (path: string, user = 0) =>
    app.inject({
      method: "GET",
      url: `/api${path}`,
      headers: { cookie: cookies[user] ?? "" },
    })

  beforeAll(async () => {
    fixture = await startZernioFixture()
    app = createApi(
      {
        ...config,
        zernio: {
          apiUrl: fixture.apiUrl,
          apiKey: "fixture-api-key",
          webhookSecret: "fixture",
        },
      },
      { runFollowUps: false }
    )
    for (let index = 0; index < 3; index++) {
      const email = `aghost-insights-${randomUUID()}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (error || !data.user)
        throw new Error("Could not create a disposable insight user")
      users.push(data.user.id)
      const jar = new Map<string, string>()
      await signInDisposableUser(config, email, jar)
      cookies.push(
        [...jar].map(([name, value]) => `${name}=${value}`).join("; ")
      )
      if (index < 2)
        await grantPlan(
          config,
          await workspaceIdOf(config, data.user.id),
          "pro"
        )
    }
    const headers = {
      cookie: cookies[0]!,
      origin: new URL(config.appUrl).origin,
      "content-type": "application/json",
    }
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/accounts/connect",
          headers,
          payload: {},
        })
      ).statusCode
    ).toBe(200)
    const synced = await app.inject({
      method: "POST",
      url: "/api/accounts/sync",
      headers,
      payload: {},
    })
    expect(synced.statusCode).toBe(200)
    account = synced.json<InstagramAccount[]>()[0]!
  })
  afterAll(async () => {
    await app?.close()
    await fixture?.close()
    for (const id of users) await admin.auth.admin.deleteUser(id)
  })
  beforeEach(() => {
    fixture.requests.length = 0
    fixture.state.canFetchAnalytics = true
    fixture.state.analyticsFailureStatus = 0
  })

  it("protects reports with session, plan, and workspace authorization", async () => {
    const path = `/insights?accountId=${account.id}`
    expect((await get(path, 99)).statusCode).toBe(401)
    expect((await get(path, 2)).statusCode).toBe(402)
    expect((await get(path, 1)).statusCode).toBe(404)
    expect(
      (await get(`/insights/posts/guessed?accountId=${account.id}`, 1))
        .statusCode
    ).toBe(404)
    expect(fixture.requests).toHaveLength(0)
    const timing = `/insights/posting-times?accountId=${account.id}`
    expect((await get(timing, 99)).statusCode).toBe(401)
    expect((await get(timing, 2)).statusCode).toBe(402)
    expect((await get(timing, 1)).statusCode).toBe(404)
    expect(fixture.requests).toHaveLength(0)
  })

  it("validates query parameters before contacting Instagram", async () => {
    const invalid = await get(`/insights?accountId=${account.id}&days=365`)
    expect(invalid.statusCode).toBe(422)
    expect(invalid.json().error.code).toBe("validation_failed")
    expect(fixture.requests).toHaveLength(0)
    expect(
      (await get("/insights/posting-times?accountId=invalid")).statusCode
    ).toBe(422)
    expect(fixture.requests).toHaveLength(0)
  })

  it("returns posting-time samples through the account-scoped endpoint and real SDK", async () => {
    const response = await get(
      `/insights/posting-times?accountId=${account.id}`
    )
    expect(response.statusCode).toBe(200)
    const timing = response.json<InsightTimingReport>()
    if (timing.status !== "ready") throw new Error("Expected posting times")
    expect(timing.slots[0]).toEqual({
      dayOfWeek: 2,
      hour: 13,
      averageEngagement: 510.3,
      postCount: 15,
    })
    expect(Number.isNaN(Date.parse(timing.referenceTime))).toBe(false)
    fixture.state.analyticsFailureStatus = 402
    expect(
      (await get(`/insights/posting-times?accountId=${account.id}`)).json()
    ).toEqual({ status: "not_enabled" })
  })

  it("returns account performance and the matching post's history through the real SDK", async () => {
    const response = await get(`/insights?accountId=${account.id}&days=7`)
    expect(response.statusCode).toBe(200)
    const report = response.json<InsightReport>()
    if (report.status !== "ready") throw new Error("Expected insights")
    expect(report.summary.reach).toBe(13_200)
    expect(report.dailyReach).toHaveLength(7)
    expect(report.posts[0]?.metrics.averageWatchSeconds).toBe(12.5)
    const detail = await get(
      `/insights/posts/${report.posts[0]!.id}?accountId=${account.id}&days=7`
    )
    expect(detail.statusCode).toBe(200)
    const post = detail.json<InsightPostReport>()
    if (post.status !== "ready") throw new Error("Expected post insights")
    expect(post.views.map((point) => point.value)).toEqual([
      120,
      640,
      null,
      null,
      null,
      null,
      null,
    ])
  })

  it("exposes reconnection and analytics availability without inventing counters", async () => {
    fixture.state.canFetchAnalytics = false
    expect((await get(`/insights?accountId=${account.id}`)).json()).toEqual({
      status: "reconnect_required",
    })
    fixture.state.canFetchAnalytics = true
    fixture.state.analyticsFailureStatus = 402
    expect((await get(`/insights?accountId=${account.id}`)).json()).toEqual({
      status: "not_enabled",
    })
  })
})
