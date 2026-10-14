import { create } from "zustand"
import type { ScheduledPost } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

/** The days a month's grid shows: whole weeks, from Sunday. */
export function daysOf(month: Date): Date[] {
  const year = month.getFullYear()
  const index = month.getMonth()
  const lead = new Date(year, index, 1).getDay()
  const length = new Date(year, index + 1, 0).getDate()
  const weeks = Math.ceil((lead + length) / 7)
  return Array.from(
    { length: weeks * 7 },
    (_, day) => new Date(year, index, 1 - lead + day)
  )
}

/** From a month grid's first day to the start of the day after its last. */
function rangeOf(month: Date): { from: Date; to: Date } {
  const days = daysOf(month)
  const end = days.at(-1)!
  return {
    from: days[0]!,
    to: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1),
  }
}

function thisMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// Only the latest load's answer is shown, whichever month it asked for.
let generation = 0

type CalendarState = {
  /** The first day of the month on show, in local time. */
  month: Date
  posts: ScheduledPost[]
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  load: () => Promise<void>
  /** Shows the month that many months away, or the current one for null. */
  show: (months: number | null) => Promise<void>
  applySaved: (post: ScheduledPost) => void
  applyRemoved: (id: string) => void
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  month: thisMonth(),
  posts: [],
  status: "idle",
  error: null,
  load: async () => {
    const current = ++generation
    const { from, to } = rangeOf(get().month)
    set({ status: "loading", error: null })
    try {
      const posts = await api.scheduledPosts.list({
        from: from.toISOString(),
        to: to.toISOString(),
      })
      if (current === generation) set({ posts, status: "ready" })
    } catch (error) {
      if (current === generation)
        set({ error: errorMessage(error), status: "error" })
    }
  },
  show: async (months) => {
    const current = get().month
    set({
      month:
        months === null
          ? thisMonth()
          : new Date(current.getFullYear(), current.getMonth() + months, 1),
      posts: [],
    })
    await get().load()
  },
  applySaved: (post) => {
    const { from, to } = rangeOf(get().month)
    const at = new Date(post.scheduledFor)
    const others = get().posts.filter((item) => item.id !== post.id)
    set({
      // A post moved to another month leaves this one.
      posts:
        at >= from && at < to
          ? [...others, post].sort((a, b) =>
              a.scheduledFor.localeCompare(b.scheduledFor)
            )
          : others,
    })
  },
  applyRemoved: (id) =>
    set({ posts: get().posts.filter((item) => item.id !== id) }),
}))
