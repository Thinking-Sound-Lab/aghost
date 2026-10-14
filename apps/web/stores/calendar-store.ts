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

function thisMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

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
    const month = get().month
    const days = daysOf(month)
    const end = days.at(-1)!
    set({ status: "loading", error: null })
    try {
      const posts = await api.scheduledPosts.list({
        from: days[0]!.toISOString(),
        to: new Date(
          end.getFullYear(),
          end.getMonth(),
          end.getDate() + 1
        ).toISOString(),
      })
      // A slower answer for a month left behind is dropped.
      if (get().month === month) set({ posts, status: "ready" })
    } catch (error) {
      if (get().month === month)
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
    const others = get().posts.filter((item) => item.id !== post.id)
    set({
      posts: [...others, post].sort((a, b) =>
        a.scheduledFor.localeCompare(b.scheduledFor)
      ),
    })
  },
  applyRemoved: (id) =>
    set({ posts: get().posts.filter((item) => item.id !== id) }),
}))
