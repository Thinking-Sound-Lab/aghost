import { create } from "zustand"
import type { InsightOverview, InsightPeriod } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

let generation = 0

type OverviewState = {
  /** The social set the overview covers. */
  socialSetId: string | null
  days: InsightPeriod
  status: "idle" | "loading" | "ready" | "error"
  overview: InsightOverview | null
  error: string | null
  /** Loads the set's overview, for the period given or the one kept. */
  show: (socialSetId: string, days?: InsightPeriod) => Promise<void>
  period: (days: InsightPeriod) => Promise<void>
  load: () => Promise<void>
  clear: () => void
}

const initial = {
  socialSetId: null,
  days: 30 as InsightPeriod,
  status: "idle" as const,
  overview: null,
  error: null,
}

/** A social set's channels at a glance, for the home page. */
export const useOverviewStore = create<OverviewState>((set, get) => ({
  ...initial,
  show: async (socialSetId, days) => {
    set({ socialSetId, ...(days && { days }) })
    await get().load()
  },
  period: async (days) => {
    set({ days })
    await get().load()
  },
  load: async () => {
    const { socialSetId, days } = get()
    if (!socialSetId) return
    const current = ++generation
    // Another period's numbers must not show while this one loads.
    set({ status: "loading", overview: null, error: null })
    try {
      const overview = await api.insights.overview(socialSetId, days)
      if (current === generation) set({ overview, status: "ready" })
    } catch (error) {
      if (current === generation)
        set({ error: errorMessage(error), status: "error" })
    }
  },
  clear: () => {
    ++generation
    set(initial)
  },
}))
