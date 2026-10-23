"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, Share2, Zap } from "lucide-react"
import {
  PLATFORM_RULES,
  accountLabel,
  type ScheduledPost,
  type ScheduledPostStatus,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, ErrorBanner, Page } from "@/components/interface"
import { PlatformIcon } from "@/components/platform-icon"
import { MediaThumb } from "@/features/calendar/post-media"
import { daysOf, useCalendarStore } from "@/stores/calendar-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

export const STATUS: Record<
  ScheduledPostStatus,
  { label: string; dot: string }
> = {
  scheduled: { label: "Scheduled", dot: "bg-muted-foreground/60" },
  publishing: { label: "Publishing", dot: "bg-amber-500" },
  published: { label: "Published", dot: "bg-emerald-500" },
  failed: { label: "Failed", dot: "bg-destructive" },
}

const monthName = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
})
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" })
const dayName = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
})
const clock = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
})

const pad = (value: number) => String(value).padStart(2, "0")

/** A local day as YYYY-MM-DD, for links and grouping. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function Calendar() {
  const store = useCalendarStore()
  const accounts = useWorkspaceStore((state) => state.accounts)
  const { status, load } = store
  useEffect(() => {
    // Returning to the page shows what was published meanwhile.
    void load()
  }, [load])

  if (accounts.length === 0)
    return (
      <Page title="Calendar">
        <EmptyState icon={<Share2 />} title="Connect a channel first">
          <Link
            href="/settings#channels"
            className={buttonVariants({ variant: "secondary" })}
          >
            Go to settings
          </Link>
        </EmptyState>
      </Page>
    )

  const days = daysOf(store.month)
  const byDay = new Map<string, ScheduledPost[]>()
  for (const post of store.posts) {
    const key = dayKey(new Date(post.scheduledFor))
    byDay.set(key, [...(byDay.get(key) ?? []), post])
  }
  const today = dayKey(new Date())

  return (
    <Page
      title="Calendar"
      actions={
        <>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => void store.show(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void store.show(null)}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => void store.show(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <Link href="/calendar/new" className={buttonVariants()}>
            <Plus />
            New post
          </Link>
        </>
      }
    >
      <div className="-mt-4 flex items-center gap-3">
        <h2 className="text-base font-semibold" aria-live="polite">
          {monthName.format(store.month)}
        </h2>
        {status === "loading" && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>
      <ErrorBanner message={store.error} retry={() => void store.load()} />

      {/* Wide screens: the month as a grid. */}
      <div className="hidden overflow-hidden rounded-md bg-border md:block">
        <div className="grid grid-cols-7 gap-px">
          {days.slice(0, 7).map((day) => (
            <span
              key={day.getDay()}
              className="bg-muted px-2 py-1.5 text-xs text-muted-foreground"
            >
              {weekday.format(day)}
            </span>
          ))}
          {days.map((day) => {
            const key = dayKey(day)
            const inMonth = day.getMonth() === store.month.getMonth()
            const past = key < today
            return (
              <div
                key={key}
                className="group flex min-h-28 flex-col gap-1 bg-card p-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-xs",
                      !inMonth && "text-muted-foreground/60",
                      past && inMonth && "text-muted-foreground",
                      key === today &&
                        "bg-foreground font-medium text-background"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {!past && (
                    <Link
                      href={`/calendar/new?day=${key}`}
                      aria-label={`New post on ${dayName.format(day)}`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon-xs",
                        className:
                          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                      })}
                    >
                      <Plus />
                    </Link>
                  )}
                </div>
                {byDay.get(key)?.map((post) => (
                  <PostChip key={post.id} post={post} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Narrow screens: the month's posts as a list of days. */}
      <div className="grid gap-6 md:hidden">
        {[...byDay.entries()].map(([key, posts]) => (
          <section key={key} className="grid gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">
              {dayName.format(new Date(posts[0]!.scheduledFor))}
            </h3>
            {posts.map((post) => (
              <PostChip key={post.id} post={post} />
            ))}
          </section>
        ))}
        {byDay.size === 0 && status === "ready" && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing scheduled this month
          </p>
        )}
      </div>
    </Page>
  )
}

function PostChip({ post }: { post: ScheduledPost }) {
  const accounts = useWorkspaceStore((state) => state.accounts)
  const account = accounts.find((item) => item.id === post.accountId)
  const status = STATUS[post.status]
  const cover = post.media[0]
  return (
    <Link
      href={`/calendar/${post.id}`}
      title={post.caption ?? undefined}
      className="flex min-w-0 items-center gap-1.5 rounded-md p-1 text-xs transition-colors hover:bg-muted"
    >
      <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded bg-muted text-muted-foreground">
        {cover ? (
          <MediaThumb media={cover} />
        ) : (
          <PlatformIcon platform={post.platform} size={12} />
        )}
        {cover && (
          <span className="absolute right-0.5 bottom-0.5 grid size-3.5 place-items-center rounded-full bg-background text-foreground">
            <PlatformIcon platform={post.platform} size={8} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-medium whitespace-nowrap tabular-nums">
          {clock.format(new Date(post.scheduledFor))}
          {post.trialReel && (
            <span
              className="rounded bg-muted px-1 text-[10px] font-normal text-muted-foreground"
              title="Scheduled to launch as a Trial Reel; check Instagram for its current sharing status"
            >
              Trial
            </span>
          )}
          {post.automationIds.length > 0 && (
            <Zap
              aria-label="Has an automation"
              className="size-3 text-muted-foreground"
            />
          )}
        </span>
        <span className="block truncate text-muted-foreground">
          {post.kind === "story"
            ? "Story"
            : (post.youtube?.title ??
              post.caption ??
              (account
                ? accountLabel(account)
                : PLATFORM_RULES[post.platform].name))}
        </span>
      </span>
      <span
        role="img"
        aria-label={status.label}
        title={status.label}
        className={cn("size-1.5 shrink-0 rounded-full", status.dot)}
      />
    </Link>
  )
}
