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
let contentGeneration = 0

type InsightsState = {
  workspaceId: string | null
  accountId: string | null
  days: InsightPeriod
  page: number
  sort: InsightQuery["sort"]
  status: "idle" | "loading" | "ready" | "error"
  report: InsightReport | null
  error: string | null
  contentLoading: boolean
  contentError: string | null
  postId: string | null
  postReport: InsightPostReport | null
  postError: string | null
  postLoading: boolean
  timing: InsightTimingReport | null
  timingLoading: boolean
  timingError: string | null
  timingUtc: boolean
  setTimingUtc: (utc: boolean) => void
  show: (workspaceId: string, accountId: string) => Promise<void>
  load: () => Promise<void>
  loadContent: () => Promise<void>
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
  contentLoading: false,
  contentError: null,
  postId: null,
  postReport: null,
  postError: null,
  postLoading: false,
  timing: null,
  timingLoading: false,
  timingError: null,
  timingUtc: false,
}

export const useInsightsStore = create<InsightsState>((set, get) => ({
  ...initial,
  setTimingUtc: (timingUtc) => set({ timingUtc }),
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
    ++contentGeneration
    get().closePost()
    // A new date range must not show the previous range's numbers.
    set({
      status: "loading",
      report: null,
      error: null,
      contentLoading: false,
      contentError: null,
    })
    try {
      const report = await api.insights.get({ accountId, days, page, sort })
      if (current === generation) set({ report, status: "ready" })
    } catch (error) {
      if (current === generation)
        set({ error: errorMessage(error), status: "error" })
    }
  },
  loadContent: async () => {
    const { workspaceId, accountId, days, page, sort, report } = get()
    if (!workspaceId || !accountId) return
    if (report?.status !== "ready") {
      await get().load()
      return
    }
    const current = ++contentGeneration
    get().closePost()
    set({ contentLoading: true, contentError: null })
    try {
      const content = await api.insights.content({
        accountId,
        days,
        page,
        sort,
      })
      if (current !== contentGeneration) return
      if (content.status !== "ready") {
        set({ report: content, contentLoading: false })
        return
      }
      const latest = get().report
      if (latest?.status !== "ready") return
      // A UTC day may have rolled over since the summary was fetched.
      if (
        content.range.fromDate !== latest.range.fromDate ||
        content.range.toDate !== latest.range.toDate
      ) {
        await get().load()
        return
      }
      set({ report: { ...latest, ...content }, contentLoading: false })
    } catch (error) {
      if (current === contentGeneration)
        set({ contentError: errorMessage(error), contentLoading: false })
    }
  },
  period: async (days) => {
    set({ days, page: 1 })
    await get().load()
  },
  order: async (sort) => {
    set({ sort, page: 1 })
    await get().loadContent()
  },
  paginate: async (page) => {
    set({ page })
    await get().loadContent()
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
    ++contentGeneration
    set(initial)
  },
}))
