import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ScheduledPost } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useCalendarStore } from "./calendar-store"

vi.mock("@/lib/api", () => ({
  api: { scheduledPosts: { list: vi.fn() } },
}))
vi.mock("@/lib/analytics", () => ({ analytics: null }))
vi.mock("./auth-store", () => ({
  useAuthStore: { getState: () => ({ expire: vi.fn() }) },
}))

const october = new Date(2026, 9, 1)

function post(id: string, scheduledFor: Date): ScheduledPost {
  return {
    id,
    instagramAccountId: "11111111-1111-4111-8111-111111111111",
    kind: "post",
    caption: "Caption",
    trialReel: null,
    media: [{ url: "https://media.example/cover.jpg", type: "image" }],
    scheduledFor: scheduledFor.toISOString(),
    status: "scheduled",
    platformPostId: null,
    permalink: null,
    publishedAt: null,
    error: null,
    automationIds: [],
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

describe("the calendar's month of posts", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useCalendarStore.setState(
      { ...useCalendarStore.getInitialState(), month: october },
      true
    )
  })

  it("shows the latest load's answer when an earlier one arrives last", async () => {
    const earlier = deferred<ScheduledPost[]>()
    const later = deferred<ScheduledPost[]>()
    vi.mocked(api.scheduledPosts.list)
      .mockReturnValueOnce(earlier.promise)
      .mockReturnValueOnce(later.promise)
    const first = useCalendarStore.getState().load()
    const second = useCalendarStore.getState().load()
    const current = [post("current", new Date(2026, 9, 20, 10))]
    later.resolve(current)
    await second
    earlier.resolve([])
    await first
    expect(useCalendarStore.getState()).toMatchObject({
      posts: current,
      status: "ready",
    })
  })

  it("keeps only posts inside the month on show", () => {
    const { applySaved } = useCalendarStore.getState()
    const moved = post("moved", new Date(2026, 9, 20, 10))
    applySaved(moved)
    expect(useCalendarStore.getState().posts).toEqual([moved])
    applySaved({ ...moved, scheduledFor: new Date(2026, 11, 20).toISOString() })
    applySaved(post("later", new Date(2026, 11, 21, 10)))
    expect(useCalendarStore.getState().posts).toEqual([])
  })
})
