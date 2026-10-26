"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ChartNoAxesCombined, Plus } from "lucide-react"
import {
  INSIGHT_PERIODS,
  PLATFORM_RULES,
  accountLabel,
  type InsightOverview,
  type InsightPeriod,
} from "@workspace/api/contract"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { EmptyState, ErrorBanner, Loading, Page } from "@/components/interface"
import { Instagram } from "@/components/instagram-icon"
import { PlatformIcon } from "@/components/platform-icon"
import { AutomationRows } from "@/features/automations/automation-list"
import { contactHref } from "@/features/marketing/contact"
import { count } from "@/lib/format"
import { useAuthStore } from "@/stores/auth-store"
import { useOverviewStore } from "@/stores/overview-store"
import {
  accountsIn,
  automationsIn,
  useActiveSet,
} from "@/stores/social-set-store"
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

function Overview() {
  const socialSet = useActiveSet()
  const socialSetId = socialSet?.id
  const accounts = useWorkspaceStore((state) => state.accounts)
  const store = useOverviewStore()
  const show = store.show
  const clear = store.clear
  // A channel connected or removed changes what the overview adds up.
  const connected = accountsIn(accounts, socialSet)
    .filter((account) => account.status === "connected")
    .map((account) => account.id)
    .join()
  useEffect(() => {
    if (socialSetId) void show(socialSetId)
  }, [socialSetId, connected, show])
  useEffect(() => clear, [clear])
  const overview = store.overview
  const ready = overview?.status === "ready" ? overview : null

  return (
    <section
      className="grid grid-cols-[minmax(0,1fr)] gap-6"
      aria-labelledby="overview-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="overview-heading" className="text-sm font-semibold">
          {socialSet?.name}
        </h2>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="overview-period">
            Period
          </label>
          <NativeSelect
            id="overview-period"
            value={store.days}
            onChange={(event) =>
              void store.period(Number(event.target.value) as InsightPeriod)
            }
          >
            {INSIGHT_PERIODS.map((days) => (
              <option key={days} value={days}>
                Last {days} days
              </option>
            ))}
          </NativeSelect>
          <Link
            href="/analytics"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Analytics
          </Link>
        </div>
      </div>
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
          </p>
        </>
      )}
    </section>
  )
}

function Automations() {
  const store = useWorkspaceStore()
  const socialSet = useActiveSet()
  const loadStats = store.loadStats
  useEffect(() => {
    void loadStats()
  }, [loadStats])
  const automations = automationsIn(
    store.automations,
    store.accounts,
    socialSet
  )
  // Automations answer Instagram comments, so they need an Instagram account.
  const instagram = accountsIn(store.accounts, socialSet).some(
    (item) => item.platform === "instagram" && item.status === "connected"
  )
  function total(key: "dmsSent" | "linkClicks") {
    if (!store.stats) return "—"
    const values = automations.map((item) => store.stats?.[item.id]?.[key])
    if (values.some((value) => value == null)) return "—"
    return count(values.reduce<number>((sum, value) => sum + value!, 0))
  }
  return (
    <section
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
      aria-labelledby="automations-heading"
    >
      <div className="flex items-center justify-between">
        <h2 id="automations-heading" className="text-sm font-semibold">
          Automations
        </h2>
        <Link
          href="/automations"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </div>
      {!instagram && (
        <div className="flex items-center gap-3 bg-muted px-5 py-4">
          <Instagram size={20} />
          <p className="mr-auto text-sm font-medium">
            Connect Instagram to reply to comments with DMs
          </p>
          <Button
            disabled={store.busy || !socialSet}
            onClick={() =>
              socialSet && void store.connect("instagram", socialSet.id)
            }
          >
            Connect
          </Button>
        </div>
      )}
      <dl className="grid grid-cols-3 gap-6">
        {[
          [
            "Active",
            count(
              automations.filter((item) => item.status === "active").length
            ),
          ],
          ["DMs sent", total("dmsSent")],
          ["Link clicks", total("linkClicks")],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <ErrorBanner
        message={store.statsError}
        retry={() => void store.loadStats()}
      />
      <AutomationRows
        items={automations.slice(0, 5)}
        total={automations.length}
      />
    </section>
  )
}

export function Home() {
  const name = useAuthStore((state) => state.user?.name?.trim())
  const first = name?.split(/\s+/)[0]
  return (
    <Page
      title={first ? `Welcome, ${first}` : "Welcome"}
      actions={
        <>
          <Link
            href="/automations/new"
            className={buttonVariants({
              variant: "secondary",
              className: "max-sm:hidden",
            })}
          >
            New automation
          </Link>
          <Link href="/calendar/new" className={buttonVariants()}>
            <Plus />
            New post
          </Link>
        </>
      }
    >
      <Overview />
      <Automations />
      <section className="flex flex-wrap items-center gap-4">
        <div className="mr-auto grid gap-1">
          <h2 className="text-sm font-semibold">Work with your agent</h2>
          <p className="text-sm text-muted-foreground">
            Connect through MCP or use the REST API in your own workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings#mcp"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Set up MCP
          </Link>
          <Link
            href="/settings#api"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            API access
          </Link>
        </div>
      </section>
    </Page>
  )
}
