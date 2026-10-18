import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  InsightReport,
  InsightPostReport,
  InsightTimingReport,
} from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useInsightsStore } from "./insights-store"

vi.mock("@/lib/api", () => ({
  api: { insights: { get: vi.fn(), post: vi.fn(), postingTimes: vi.fn() } },
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

describe("analytics request ownership", () => {
  beforeEach(() => {
    useInsightsStore.getState().clear()
    vi.resetAllMocks()
    vi.mocked(api.insights.postingTimes).mockResolvedValue({
      status: "not_enabled",
    })
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
})
