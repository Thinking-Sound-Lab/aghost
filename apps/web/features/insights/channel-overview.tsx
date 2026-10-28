"use client"

import {
  PLATFORM_RULES,
  accountLabel,
  type Account,
  type InsightOverview,
} from "@workspace/api/contract"
import { PlatformIcon } from "@/components/platform-icon"
import { count, timeAgo } from "@/lib/format"

type Ready = Extract<InsightOverview, { status: "ready" }>

const percent = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
})

/** "+12% vs previous 30 days", or nothing when there's no base to compare. */
function change(current: number | null, previous: number | null, days: number) {
  if (current === null || previous === null || previous === 0) return null
  return `${percent.format((current - previous) / previous)} vs previous ${days} days`
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`
}

function Stat({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string | null
}) {
  return (
    <div className="grid content-start gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
      <dd className="min-h-4 text-xs text-muted-foreground">{note}</dd>
    </div>
  )
}

function Totals({ overview, days }: { overview: Ready; days: number }) {
  const { totals, previousTotals } = overview
  return (
    <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      <Stat
        label="Followers"
        value={count(overview.followers)}
        note={
          overview.followersGained === null
            ? null
            : overview.followersGained === 0
              ? `No change in ${days} days`
              : `${signed(overview.followersGained)} in ${days} days`
        }
      />
      <Stat
        label="Posts"
        value={count(totals.posts)}
        note={change(totals.posts, previousTotals.posts, days)}
      />
      <Stat
        label="Views"
        value={count(totals.views)}
        note={change(totals.views, previousTotals.views, days)}
      />
      <Stat
        label="Engagement"
        value={count(totals.engagements)}
        note={change(totals.engagements, previousTotals.engagements, days)}
      />
    </dl>
  )
}

function Channels({
  overview,
  accounts,
}: {
  overview: Ready
  accounts: Account[]
}) {
  return (
    <div className="divide-y">
      <div className="-mx-3 flex items-center gap-4 px-3 pb-2 text-xs text-muted-foreground">
        <span className="flex-1">Channel</span>
        <span className="w-20 text-right">Followers</span>
        <span className="hidden w-16 text-right sm:block">Posts</span>
        <span className="w-20 text-right">Views</span>
        <span className="hidden w-24 text-right sm:block">Engagement</span>
      </div>
      {overview.channels.map((channel) => {
        const names = accounts
          .filter((account) => channel.accountIds.includes(account.id))
          .map(accountLabel)
          .join(", ")
        return (
          <div
            key={channel.platform}
            className="-mx-3 flex items-center gap-4 px-3 py-3"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
              <PlatformIcon platform={channel.platform} size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {PLATFORM_RULES[channel.platform].name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{names}</p>
            </div>
            <div className="w-20 text-right">
              <p className="text-sm tabular-nums">{count(channel.followers)}</p>
              {channel.followersGained !== null &&
                channel.followersGained !== 0 && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {signed(channel.followersGained)}
                  </p>
                )}
            </div>
            <span className="hidden w-16 text-right text-sm tabular-nums sm:block">
              {count(channel.posts)}
            </span>
            <span className="w-20 text-right text-sm tabular-nums">
              {count(channel.metrics.views)}
            </span>
            <span className="hidden w-24 text-right text-sm tabular-nums sm:block">
              {count(channel.engagements)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** A set's totals and how each of its channels did. */
export function ChannelOverview({
  overview,
  days,
  accounts,
}: {
  overview: Ready
  days: number
  /** The workspace's accounts, to name each channel's. */
  accounts: Account[]
}) {
  return (
    <>
      <Totals overview={overview} days={days} />
      <Channels overview={overview} accounts={accounts} />
      <p className="text-xs text-muted-foreground">
        Posts published in the period, with their lifetime views and engagement.
        {overview.updatedAt && (
          <span className="ml-1">Updated {timeAgo(overview.updatedAt)}.</span>
        )}
      </p>
    </>
  )
}
