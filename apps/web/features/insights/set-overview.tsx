"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ChartNoAxesCombined } from "lucide-react"
import {
  PLATFORM_RULES,
  accountLabel,
  type InsightOverview,
  type InsightPeriod,
} from "@workspace/api/contract"
import { buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, ErrorBanner, Loading } from "@/components/interface"
import { PlatformIcon } from "@/components/platform-icon"
import { contactHref } from "@/features/marketing/contact"
import { count, timeAgo } from "@/lib/format"
import { useOverviewStore } from "@/stores/overview-store"
import { accountsIn, useActiveSet } from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

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

function Channels({ overview }: { overview: Ready }) {
  const accounts = useWorkspaceStore((state) => state.accounts)
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

/**
 * Loads the shown set's overview, and again when its channels change. With
 * `days`, the period follows the caller; without, the store keeps its own.
 */
export function useSetOverview(days?: InsightPeriod) {
  const socialSet = useActiveSet()
  const socialSetId = socialSet?.id
  const accounts = useWorkspaceStore((state) => state.accounts)
  const show = useOverviewStore((state) => state.show)
  const clear = useOverviewStore((state) => state.clear)
  const connected = accountsIn(accounts, socialSet)
    .filter((account) => account.status === "connected")
    .map((account) => account.id)
    .join()
  useEffect(() => {
    if (socialSetId) void show(socialSetId, days)
  }, [socialSetId, connected, days, show])
  useEffect(() => clear, [clear])
}

/** A set's totals and channels, or why they can't be shown. */
export function SetOverview() {
  const store = useOverviewStore()
  const overview = store.overview
  const ready = overview?.status === "ready" ? overview : null
  return (
    <>
      <ErrorBanner message={store.error} retry={() => void store.load()} />
      {(store.status === "loading" || store.status === "idle") && (
        <Loading className="min-h-48" />
      )}
      {overview?.status === "reconnect_required" && (
        <p className="bg-muted px-5 py-4 text-sm">
          Reconnect your channels in{" "}
          <Link href="/settings#channels" className="underline">
            Settings
          </Link>{" "}
          to see their stats.
        </p>
      )}
      {overview?.status === "not_enabled" && (
        <p className="bg-muted px-5 py-4 text-sm">
          Channel stats need analytics access for your workspace.{" "}
          <a href={contactHref("Analytics access")} className="underline">
            Contact support
          </a>
        </p>
      )}
      {ready && ready.channels.length === 0 && (
        <EmptyState
          icon={<ChartNoAxesCombined />}
          title="Connect a channel to see its stats"
        >
          <Link href="/settings#channels" className={buttonVariants()}>
            Connect a channel
          </Link>
        </EmptyState>
      )}
      {ready && ready.channels.length > 0 && (
        <>
          <Totals overview={ready} days={store.days} />
          <Channels overview={ready} />
          <p className="text-xs text-muted-foreground">
            Posts published in the period, with their lifetime views and
            engagement.
            {ready.updatedAt && (
              <span className="ml-1">Updated {timeAgo(ready.updatedAt)}.</span>
            )}
          </p>
        </>
      )}
    </>
  )
}
