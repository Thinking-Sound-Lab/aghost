import { beforeEach, describe, expect, it, vi } from "vitest"
import type { InsightOverview } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useOverviewStore } from "./overview-store"

vi.mock("@/lib/api", () => ({
  api: { insights: { overview: vi.fn() } },
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

const totals = { posts: 2, views: 100, engagements: 10 }
const ready = (posts: number): InsightOverview => ({
  status: "ready",
  range: { fromDate: "2026-10-01", toDate: "2026-10-30" },
  previousRange: { fromDate: "2026-09-01", toDate: "2026-09-30" },
  followers: 10,
  followersGained: 1,
  totals: { ...totals, posts },
  previousTotals: totals,
  channels: [],
  updatedAt: null,
})

describe("home overview", () => {
  beforeEach(() => {
    useOverviewStore.getState().clear()
    vi.resetAllMocks()
  })

  it("shows the latest period, not a slower earlier one", async () => {
    const first = deferred<InsightOverview>()
    vi.mocked(api.insights.overview)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(ready(7))
    const earlier = useOverviewStore.getState().show("set")
    await useOverviewStore.getState().period(7)
    first.resolve(ready(30))
    await earlier
    expect(useOverviewStore.getState()).toMatchObject({
      days: 7,
      status: "ready",
      overview: { totals: { posts: 7 } },
    })
    expect(api.insights.overview).toHaveBeenLastCalledWith("set", 7)
  })

  it("hides the previous numbers while a period loads and keeps errors", async () => {
    vi.mocked(api.insights.overview).mockResolvedValueOnce(ready(3))
    await useOverviewStore.getState().show("set")
    const pending = deferred<InsightOverview>()
    vi.mocked(api.insights.overview).mockReturnValueOnce(pending.promise)
    const loading = useOverviewStore.getState().period(90)
    expect(useOverviewStore.getState()).toMatchObject({
      status: "loading",
      overview: null,
    })
    pending.resolve(ready(9))
    await loading
    vi.mocked(api.insights.overview).mockRejectedValueOnce(
      new Error("Couldn't load channel performance.")
    )
    await useOverviewStore.getState().load()
    expect(useOverviewStore.getState()).toMatchObject({
      status: "error",
      overview: null,
      error: "Couldn't load channel performance.",
    })
  })

  it("ignores a response that arrives after leaving the page", async () => {
    const pending = deferred<InsightOverview>()
    vi.mocked(api.insights.overview).mockReturnValueOnce(pending.promise)
    const loading = useOverviewStore.getState().show("set")
    useOverviewStore.getState().clear()
    pending.resolve(ready(1))
    await loading
    expect(useOverviewStore.getState()).toMatchObject({
      socialSetId: null,
      status: "idle",
      overview: null,
    })
  })
})
