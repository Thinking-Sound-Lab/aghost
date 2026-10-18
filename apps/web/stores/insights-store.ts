import { create } from "zustand"
import type {
  InsightPeriod,
  InsightPostReport,
  InsightQuery,
  InsightReport,
  InsightTimingReport,
} from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

let generation = 0
let postGeneration = 0
let timingGeneration = 0

type InsightsState = {
  workspaceId: string | null
  accountId: string | null
  days: InsightPeriod
  page: number
  sort: InsightQuery["sort"]
  status: "idle" | "loading" | "ready" | "error"
  report: InsightReport | null
  error: string | null
  postId: string | null
  postReport: InsightPostReport | null
  postError: string | null
  postLoading: boolean
  timing: InsightTimingReport | null
  timingLoading: boolean
  timingError: string | null
  show: (workspaceId: string, accountId: string) => Promise<void>
  load: () => Promise<void>
  loadTiming: () => Promise<void>
  refresh: () => Promise<void>
  period: (days: InsightPeriod) => Promise<void>
  order: (sort: InsightQuery["sort"]) => Promise<void>
  paginate: (page: number) => Promise<void>
  openPost: (id: string) => Promise<void>
  closePost: () => void
  clear: () => void
}

const initial = {
  workspaceId: null,
  accountId: null,
  days: 30 as InsightPeriod,
  page: 1,
  sort: "views" as InsightQuery["sort"],
  status: "idle" as const,
  report: null,
  error: null,
  postId: null,
  postReport: null,
  postError: null,
  postLoading: false,
  timing: null,
  timingLoading: false,
  timingError: null,
}

export const useInsightsStore = create<InsightsState>((set, get) => ({
  ...initial,
  show: async (workspaceId, accountId) => {
    set({ workspaceId, accountId, page: 1, timing: null, timingError: null })
    await get().refresh()
  },
  refresh: async () => {
    await Promise.all([get().load(), get().loadTiming()])
  },
  loadTiming: async () => {
    const { workspaceId, accountId } = get()
    if (!workspaceId || !accountId) return
    const current = ++timingGeneration
    set({ timing: null, timingLoading: true, timingError: null })
    try {
      const timing = await api.insights.postingTimes(accountId)
      if (current === timingGeneration) set({ timing, timingLoading: false })
    } catch (error) {
      if (current === timingGeneration)
        set({ timingError: errorMessage(error), timingLoading: false })
    }
  },
  load: async () => {
    const { workspaceId, accountId, days, page, sort } = get()
    if (!workspaceId || !accountId) return
    const current = ++generation
    get().closePost()
    // A new date range must not show the previous range's numbers.
    set({ status: "loading", report: null, error: null })
    try {
      const report = await api.insights.get({ accountId, days, page, sort })
      if (current === generation) set({ report, status: "ready" })
    } catch (error) {
      if (current === generation)
        set({ error: errorMessage(error), status: "error" })
    }
  },
  period: async (days) => {
    set({ days, page: 1 })
    await get().load()
  },
  order: async (sort) => {
    set({ sort, page: 1 })
    await get().load()
  },
  paginate: async (page) => {
    set({ page })
    await get().load()
  },
  openPost: async (postId) => {
    const { accountId, days } = get()
    if (!accountId) return
    const current = ++postGeneration
    set({ postId, postReport: null, postError: null, postLoading: true })
    try {
      const postReport = await api.insights.post(postId, { accountId, days })
      if (current === postGeneration) set({ postReport, postLoading: false })
    } catch (error) {
      if (current === postGeneration)
        set({ postError: errorMessage(error), postLoading: false })
    }
  },
  closePost: () => {
    ++postGeneration
    set({ postId: null, postReport: null, postError: null, postLoading: false })
  },
  clear: () => {
    ++generation
    ++postGeneration
    ++timingGeneration
    set(initial)
  },
}))
