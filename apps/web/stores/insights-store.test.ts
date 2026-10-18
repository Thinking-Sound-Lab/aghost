import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  InsightReport,
  InsightPostReport,
  InsightTimingReport,
  InsightContentReport,
} from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useInsightsStore } from "./insights-store"

vi.mock("@/lib/api", () => ({
  api: {
    insights: {
      get: vi.fn(),
      post: vi.fn(),
      postingTimes: vi.fn(),
      content: vi.fn(),
    },
  },
}))
vi.mock("@/lib/analytics", () => ({ analytics: null }))
vi.mock("./auth-store", () => ({
  useAuthStore: { getState: () => ({ expire: vi.fn() }) },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

const ready: Extract<InsightReport, { status: "ready" }> = {
  status: "ready",
  range: { fromDate: "2026-10-01", toDate: "2026-10-07" },
  summary: {
    views: 100,
    reach: 80,
    accountsEngaged: 12,
    totalInteractions: 15,
  },
  dailyReach: [{ date: "2026-10-01", value: 10 }],
  posts: [],
  page: 1,
  pages: 3,
  totalPosts: 50,
  contentUpdatedAt: null,
}
const content: Extract<InsightContentReport, { status: "ready" }> = {
  status: "ready",
  range: ready.range,
  posts: [],
  page: 1,
  pages: 3,
  totalPosts: 50,
  contentUpdatedAt: null,
}

describe("analytics request ownership", () => {
  beforeEach(() => {
    useInsightsStore.getState().clear()
    vi.resetAllMocks()
    vi.mocked(api.insights.postingTimes).mockResolvedValue({
      status: "not_enabled",
    })
    vi.mocked(api.insights.content).mockResolvedValue(content)
  })

  it("discards an older account's response after switching accounts", async () => {
    const first = deferred<InsightReport>()
    vi.mocked(api.insights.get)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ status: "not_enabled" })
    const earlier = useInsightsStore.getState().show("workspace", "account-one")
    await useInsightsStore.getState().show("workspace", "account-two")
    first.resolve({ status: "reconnect_required" })
    await earlier
    expect(useInsightsStore.getState()).toMatchObject({
      accountId: "account-two",
      report: { status: "not_enabled" },
      status: "ready",
    })
  })

  it("clears old data and resets pagination when the period changes", async () => {
    vi.mocked(api.insights.get).mockResolvedValue({ status: "not_enabled" })
    await useInsightsStore.getState().show("workspace", "account")
    await useInsightsStore.getState().paginate(3)
    const next = deferred<InsightReport>()
    vi.mocked(api.insights.get).mockReturnValueOnce(next.promise)
    const loading = useInsightsStore.getState().period(90)
    expect(useInsightsStore.getState()).toMatchObject({
      report: null,
      days: 90,
      page: 1,
      status: "loading",
    })
    expect(api.insights.get).toHaveBeenLastCalledWith({
      accountId: "account",
      days: 90,
      page: 1,
      sort: "views",
    })
    next.resolve({ status: "reconnect_required" })
    await loading
  })

  it("doesn't reopen a closed post when its request finishes", async () => {
    useInsightsStore.setState({
      workspaceId: "workspace",
      accountId: "account",
    })
    const detail = deferred<InsightPostReport>()
    vi.mocked(api.insights.post).mockReturnValue(detail.promise)
    const loading = useInsightsStore.getState().openPost("post")
    useInsightsStore.getState().closePost()
    detail.resolve({ status: "not_enabled" })
    await loading
    expect(useInsightsStore.getState()).toMatchObject({
      postId: null,
      postReport: null,
      postLoading: false,
    })
  })

  it("doesn't repopulate the store after leaving the workspace", async () => {
    const pending = deferred<InsightReport>()
    vi.mocked(api.insights.get).mockReturnValue(pending.promise)
    const loading = useInsightsStore.getState().show("workspace", "account")
    useInsightsStore.getState().clear()
    pending.resolve({ status: "not_enabled" })
    await loading
    expect(useInsightsStore.getState()).toMatchObject({
      workspaceId: null,
      accountId: null,
      report: null,
      status: "idle",
    })
  })

  it("discards an old account's timing response and doesn't reload timing for a period change", async () => {
    vi.mocked(api.insights.get).mockResolvedValue({ status: "not_enabled" })
    const first = deferred<InsightTimingReport>()
    vi.mocked(api.insights.postingTimes).mockReturnValueOnce(first.promise)
    const earlier = useInsightsStore.getState().show("workspace", "one")
    await useInsightsStore.getState().show("workspace", "two")
    first.resolve({ status: "reconnect_required" })
    await earlier
    expect(useInsightsStore.getState().timing).toEqual({
      status: "not_enabled",
    })
    await useInsightsStore.getState().period(7)
    expect(api.insights.postingTimes).toHaveBeenCalledTimes(2)
    expect(api.insights.postingTimes).toHaveBeenLastCalledWith("two")
  })

  it("keeps timing failures independent and ignores results after leaving", async () => {
    vi.mocked(api.insights.get).mockResolvedValue({ status: "not_enabled" })
    vi.mocked(api.insights.postingTimes).mockRejectedValueOnce(
      new Error("Timing is unavailable")
    )
    await useInsightsStore.getState().show("workspace", "account")
    expect(useInsightsStore.getState()).toMatchObject({
      status: "ready",
      report: { status: "not_enabled" },
      timing: null,
      timingLoading: false,
      timingError: "Timing is unavailable",
    })
    const pending = deferred<InsightTimingReport>()
    vi.mocked(api.insights.postingTimes).mockReturnValueOnce(pending.promise)
    const loading = useInsightsStore.getState().loadTiming()
    useInsightsStore.getState().clear()
    pending.resolve({ status: "not_enabled" })
    await loading
    expect(useInsightsStore.getState()).toMatchObject({
      workspaceId: null,
      timing: null,
      timingLoading: false,
      timingError: null,
    })
  })

  it("keeps UTC selected through period reloads, content sorting, pagination, and refresh", async () => {
    vi.mocked(api.insights.get).mockResolvedValue(ready)
    await useInsightsStore.getState().show("workspace", "account")
    useInsightsStore.getState().setTimingUtc(true)
    const pending = deferred<InsightReport>()
    vi.mocked(api.insights.get).mockReturnValueOnce(pending.promise)
    const reloading = useInsightsStore.getState().period(90)
    expect(useInsightsStore.getState()).toMatchObject({
      report: null,
      timingUtc: true,
    })
    pending.resolve(ready)
    await reloading
    await useInsightsStore.getState().order("reach")
    vi.mocked(api.insights.content).mockResolvedValueOnce({
      ...content,
      page: 2,
    })
    await useInsightsStore.getState().paginate(2)
    expect(useInsightsStore.getState()).toMatchObject({
      timingUtc: true,
      sort: "reach",
      page: 2,
    })
    expect(api.insights.get).toHaveBeenCalledTimes(2)
    expect(api.insights.content).toHaveBeenLastCalledWith({
      accountId: "account",
      days: 90,
      page: 2,
      sort: "reach",
    })
    const report = useInsightsStore.getState().report
    if (report?.status !== "ready") throw new Error("Expected report")
    expect(report.summary).toBe(ready.summary)
    expect(report.dailyReach).toBe(ready.dailyReach)
    await useInsightsStore.getState().refresh()
    expect(useInsightsStore.getState().timingUtc).toBe(true)
  })

  it("preserves account metrics while loading content and discards earlier sorts", async () => {
    vi.mocked(api.insights.get).mockResolvedValue(ready)
    await useInsightsStore.getState().show("workspace", "account")
    const first = deferred<InsightContentReport>()
    vi.mocked(api.insights.content).mockReturnValueOnce(first.promise)
    const earlier = useInsightsStore.getState().order("reach")
    expect(useInsightsStore.getState()).toMatchObject({
      report: ready,
      status: "ready",
      contentLoading: true,
    })
    await useInsightsStore.getState().order("saves")
    first.resolve({ ...content, totalPosts: 999 })
    await earlier
    expect(useInsightsStore.getState()).toMatchObject({
      sort: "saves",
      contentLoading: false,
      report: { totalPosts: 50 },
    })
    expect(api.insights.get).toHaveBeenCalledTimes(1)
    expect(api.insights.postingTimes).toHaveBeenCalledTimes(1)
  })

  it.each(["period", "account", "leave", "refresh"])(
    "discards a pending content response after %s changes",
    async (change) => {
      vi.mocked(api.insights.get).mockResolvedValue(ready)
      await useInsightsStore.getState().show("workspace", "one")
      const pending = deferred<InsightContentReport>()
      vi.mocked(api.insights.content).mockReturnValueOnce(pending.promise)
      const earlier = useInsightsStore.getState().paginate(2)
      if (change === "period") await useInsightsStore.getState().period(7)
      if (change === "account")
        await useInsightsStore.getState().show("workspace", "two")
      if (change === "leave") useInsightsStore.getState().clear()
      if (change === "refresh") await useInsightsStore.getState().refresh()
      pending.resolve({ ...content, totalPosts: 999 })
      await earlier
      expect(useInsightsStore.getState().report).toEqual(
        change === "leave" ? null : ready
      )
      expect(useInsightsStore.getState().contentLoading).toBe(false)
    }
  )

  it("keeps a content failure separate from account metrics and retries content only", async () => {
    vi.mocked(api.insights.get).mockResolvedValue(ready)
    await useInsightsStore.getState().show("workspace", "account")
    vi.mocked(api.insights.content).mockRejectedValueOnce(
      new Error("Content unavailable")
    )
    await useInsightsStore.getState().order("shares")
    expect(useInsightsStore.getState()).toMatchObject({
      report: ready,
      status: "ready",
      contentError: "Content unavailable",
      contentLoading: false,
    })
    await useInsightsStore.getState().loadContent()
    expect(useInsightsStore.getState().contentError).toBeNull()
    expect(api.insights.get).toHaveBeenCalledTimes(1)
  })

  it("reloads account metrics when the UTC report range has rolled forward", async () => {
    vi.mocked(api.insights.get).mockResolvedValue(ready)
    await useInsightsStore.getState().show("workspace", "account")
    const range = { fromDate: "2026-10-02", toDate: "2026-10-08" }
    vi.mocked(api.insights.content).mockResolvedValueOnce({ ...content, range })
    vi.mocked(api.insights.get).mockResolvedValueOnce({ ...ready, range })
    await useInsightsStore.getState().order("date")
    expect(api.insights.get).toHaveBeenCalledTimes(2)
    expect(useInsightsStore.getState()).toMatchObject({
      report: { range },
      contentLoading: false,
      status: "ready",
    })
  })
})
