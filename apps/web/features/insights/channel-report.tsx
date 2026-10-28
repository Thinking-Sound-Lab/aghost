"use client"

import { ExternalLink } from "lucide-react"
import {
  INSIGHT_PERIODS,
  PLATFORM_RULES,
  accountLabel,
  type Account,
  type ChannelReport,
  type InsightMetrics,
  type InsightPeriod,
  type InsightPostReport,
  type InsightReport,
  type Platform,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { PlatformIcon } from "@/components/platform-icon"
import { count, timeAgo } from "@/lib/format"
import {
  kindLabels,
  metricLabels,
  metricsOf,
  percentage,
} from "./content-performance"
import { DitherChart } from "./dither-chart"

type InstagramReport = Extract<InsightReport, { platform: "instagram" }>
type PostReport = Extract<InsightPostReport, { status: "ready" }>

function Tab({
  selected,
  onSelect,
  children,
}: {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex shrink-0 items-center gap-2 border-b-2 border-transparent pb-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        selected && "border-foreground font-medium text-foreground"
      )}
    >
      {children}
    </button>
  )
}

/** All, then each channel, with the period they cover. */
export function ChannelTabs({
  accounts,
  selected,
  onSelect,
  days,
  onPeriod,
}: {
  accounts: Account[]
  /** The channel shown, or null for all of them. */
  selected: string | null
  /** Called with "all" or a channel's id. */
  onSelect: (tab: string) => void
  days: InsightPeriod
  onPeriod: (days: InsightPeriod) => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b">
      <div
        role="tablist"
        aria-label="Channels"
        className="-mb-px flex min-w-0 gap-5 overflow-x-auto"
      >
        <Tab selected={selected === null} onSelect={() => onSelect("all")}>
          All
        </Tab>
        {accounts.map((item) => (
          <Tab
            key={item.id}
            selected={item.id === selected}
            onSelect={() => onSelect(item.id)}
          >
            <PlatformIcon platform={item.platform} size={14} />
            {accountLabel(item)}
          </Tab>
        ))}
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
        Period
        <NativeSelect
          value={days}
          onChange={(event) =>
            onPeriod(Number(event.target.value) as InsightPeriod)
          }
        >
          {INSIGHT_PERIODS.map((days) => (
            <option key={days} value={days}>
              Last {days} days
            </option>
          ))}
        </NativeSelect>
      </label>
    </div>
  )
}

/**
 * A platform other than Instagram: the lifetime totals of the posts published
 * in the period, and its main metric by the day they were published.
 */
export function ChannelSummary({ report }: { report: ChannelReport }) {
  const label = metricLabels[report.dailyMetric]
  return (
    <>
      <dl className="grid grid-cols-2 gap-6 border-b pb-6 sm:grid-cols-4">
        {[
          ...metricsOf(report.platform).map(
            (metric) => [metricLabels[metric], report.totals[metric]] as const
          ),
          ["Posts", report.postCount] as const,
        ].map(([name, value]) => (
          <div key={name} className="grid gap-2">
            <dt className="text-xs text-muted-foreground">{name}</dt>
            <dd className="text-3xl font-semibold tracking-tight tabular-nums">
              {count(value)}
            </dd>
          </div>
        ))}
      </dl>
      <section className="grid gap-5" aria-labelledby="daily-chart-title">
        <h2 id="daily-chart-title" className="text-sm font-semibold">
          {label} by publish date
        </h2>
        <DitherChart
          points={report.daily}
          label={label}
          description={`Lifetime ${label.toLowerCase()} of the posts published each day (UTC)`}
        />
      </section>
    </>
  )
}

/** Instagram's account insights for the period, and its daily reach. */
export function InstagramSummary({ report }: { report: InstagramReport }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-y-6 border-b pb-6 sm:grid-cols-4 sm:divide-x">
        {[
          ["Views", report.summary.views],
          ["Accounts reached", report.summary.reach],
          ["Interactions", report.summary.totalInteractions],
          ["Accounts engaged", report.summary.accountsEngaged],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`grid gap-2 ${index > 0 ? "sm:pl-6" : ""}`}
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-3xl font-semibold tracking-tight tabular-nums">
              {count(value as number | null)}
            </dd>
          </div>
        ))}
      </dl>
      <section className="grid gap-5" aria-labelledby="reach-chart-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="reach-chart-title" className="text-sm font-semibold">
            Reach over time
          </h2>
          <span className="text-xs text-muted-foreground">
            Account performance
          </span>
        </div>
        <DitherChart
          points={report.dailyReach}
          label="Accounts reached"
          description="Unique accounts reached each day (UTC)"
        />
      </section>
    </>
  )
}

/** What the report's numbers mean, and when its content last synced. */
export function ReportNote({
  report,
}: {
  report: InstagramReport | ChannelReport
}) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {report.platform === "instagram"
        ? "Instagram insights can be delayed by up to 48 hours. A dash means a metric hasn't been reported. Account reach counts unique accounts for the period and may differ from the sum of daily reach."
        : `Totals add up the lifetime metrics of the posts published in this period. A dash means ${PLATFORM_RULES[report.platform].name} doesn't report that metric or it hasn't synced yet.`}
      {report.contentUpdatedAt && (
        <span className="ml-1">
          Content last synced {timeAgo(report.contentUpdatedAt)}.
        </span>
      )}
    </p>
  )
}

function duration(seconds: number | null, total = false) {
  if (seconds === null) return "—"
  if (total && seconds >= 3600)
    return `${(seconds / 3600).toLocaleString("en", { maximumFractionDigits: 1 })} hr`
  if (total && seconds >= 60)
    return `${(seconds / 60).toLocaleString("en", { maximumFractionDigits: 1 })} min`
  return `${seconds.toLocaleString("en", { maximumFractionDigits: 1 })} sec`
}

function ReelMetrics({ metrics }: { metrics: InsightMetrics }) {
  return (
    <section className="grid gap-3 rounded-md bg-muted/50 p-4">
      <h3 className="text-sm font-semibold">Watch performance</h3>
      <dl className="grid grid-cols-3 gap-4">
        {[
          ["Average watch time", duration(metrics.averageWatchSeconds)],
          ["Total watch time", duration(metrics.totalWatchSeconds, true)],
          ["Skip rate", percentage(metrics.skipRate)],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Skip rate measures views skipped in the first 3 seconds. Instagram
        labels it estimated and in development. Total watch time includes
        replays.
      </p>
    </section>
  )
}

/** One post's lifetime metrics and its views over time. */
function PostDetail({
  detail,
  platform,
}: {
  detail: PostReport
  platform: Platform
}) {
  const metrics =
    platform === "instagram"
      ? (["views", "reach", "likes", "comments", "saves", "shares"] as const)
      : metricsOf(platform)
  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-3 gap-x-5 gap-y-4 sm:grid-cols-6">
        {metrics.map((key) => (
          <div key={key} className="grid gap-1">
            <dt className="text-xs text-muted-foreground">
              {metricLabels[key]}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">
              {count(detail.post.metrics[key])}
            </dd>
          </div>
        ))}
      </dl>
      {platform === "instagram" && detail.post.kind === "reel" && (
        <ReelMetrics metrics={detail.post.metrics} />
      )}
      <section className="grid gap-4">
        <h3 className="text-sm font-semibold">Views over time</h3>
        <DitherChart
          points={detail.views}
          label="Cumulative views"
          description="Lifetime views recorded each day (UTC)"
        />
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {detail.post.updatedAt
            ? `Last synced ${timeAgo(detail.post.updatedAt)}`
            : "Metrics haven't synced yet"}
        </span>
        {detail.post.permalink && (
          <a
            href={detail.post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View on {PLATFORM_RULES[platform].name}{" "}
            <ExternalLink aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * A post's performance over the page, once its report is ready; `children`
 * stand in while it loads or can't be shown.
 */
export function PostDialog({
  open,
  onClose,
  platform,
  detail,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  platform: Platform
  detail: PostReport | null
  /** For the dialog, which renders outside the page's tree. */
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className={cn("max-h-[90dvh] overflow-y-auto sm:max-w-3xl", className)}
      >
        <div className="grid gap-1.5 pr-8">
          <DialogTitle>
            {detail ? kindLabels[detail.post.kind] : "Content"} performance
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {detail?.post.caption ??
              "Lifetime metrics and view history for this content."}
          </DialogDescription>
        </div>
        {children}
        {detail && <PostDetail detail={detail} platform={platform} />}
      </DialogContent>
    </Dialog>
  )
}
