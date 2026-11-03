"use client"

import Link from "next/link"
import { Plus, Zap } from "lucide-react"
import {
  PLATFORM_RULES,
  accountLabel,
  type Account,
  type ScheduledPost,
  type ScheduledPostStatus,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { buttonVariants } from "@workspace/ui/components/button"
import { PlatformIcon } from "@/components/platform-icon"
import { MediaThumb } from "@/features/calendar/post-media"
import { dayKey, daysOf } from "@/lib/month"

/** What a post chip shows. */
export type ChipPost = Pick<
  ScheduledPost,
  | "id"
  | "accountId"
  | "platform"
  | "kind"
  | "caption"
  | "media"
  | "scheduledFor"
  | "trialReel"
  | "youtube"
  | "status"
  | "automationIds"
>

export const STATUS: Record<
  ScheduledPostStatus,
  { label: string; dot: string }
> = {
  scheduled: { label: "Scheduled", dot: "bg-muted-foreground/60" },
  publishing: { label: "Publishing", dot: "bg-amber-500" },
  published: { label: "Published", dot: "bg-emerald-500" },
  failed: { label: "Failed", dot: "bg-destructive" },
}

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

function PostChip({
  post,
  account,
  href,
}: {
  post: ChipPost
  account: Account | undefined
  href?: string
}) {
  const status = STATUS[post.status]
  const cover = post.media[0]
  const className =
    "flex min-w-0 items-center gap-1.5 rounded-md p-1 text-xs transition-colors"
  const content = (
    <>
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
    </>
  )
  return href ? (
    <Link
      href={href}
      title={post.caption ?? undefined}
      className={cn(className, "hover:bg-muted")}
    >
      {content}
    </Link>
  ) : (
    <div title={post.caption ?? undefined} className={className}>
      {content}
    </div>
  )
}

/**
 * A month's posts: a grid of its weeks on wide screens, a list of the days
 * with posts on narrow ones.
 */
export function MonthGrid({
  month,
  posts,
  accounts,
  ready,
  postHref,
  newPostHref,
}: {
  month: Date
  posts: ChipPost[]
  accounts: Account[]
  /** Whether the month has loaded, so an empty one says so. */
  ready: boolean
  postHref?: (id: string) => string
  /** A link to schedule a post on a day; without it, days have none. */
  newPostHref?: (day: string) => string
}) {
  const days = daysOf(month)
  const byDay = new Map<string, ChipPost[]>()
  for (const post of posts) {
    const key = dayKey(new Date(post.scheduledFor))
    byDay.set(key, [...(byDay.get(key) ?? []), post])
  }
  const today = dayKey(new Date())
  const chip = (post: ChipPost) => (
    <PostChip
      key={post.id}
      post={post}
      account={accounts.find((item) => item.id === post.accountId)}
      href={postHref?.(post.id)}
    />
  )

  return (
    <>
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
            const inMonth = day.getMonth() === month.getMonth()
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
                  {!past && newPostHref && (
                    <Link
                      href={newPostHref(key)}
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
                {byDay.get(key)?.map(chip)}
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
            {posts.map(chip)}
          </section>
        ))}
        {byDay.size === 0 && ready && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing scheduled this month
          </p>
        )}
      </div>
    </>
  )
}
