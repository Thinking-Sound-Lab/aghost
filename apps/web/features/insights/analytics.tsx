"use client"

import { useEffect, useState } from "react"
import { ChartNoAxesCombined, ExternalLink, RefreshCw } from "lucide-react"
import {
  INSIGHT_PERIODS,
  type InsightMetrics,
  type InsightPeriod,
  type InsightsUnavailable,
} from "@workspace/api/contract"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { NativeSelect } from "@workspace/ui/components/native-select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  Loading,
  Page,
} from "@/components/interface"
import { count, timeAgo } from "@/lib/format"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useInsightsStore } from "@/stores/insights-store"
import { contactHref } from "@/features/marketing/contact"
import {
  ContentPerformance,
  kindLabels,
  percentage,
} from "./content-performance"
import { DitherChart } from "./dither-chart"
import { PostingTimes } from "./posting-times"

function AccessNotice({
  status,
  accountId,
}: InsightsUnavailable & { accountId: string }) {
  const { reconnect, busy } = useWorkspaceStore()
  return (
    <EmptyState
      icon={<ChartNoAxesCombined />}
      title={
        status === "reconnect_required"
          ? "Allow access to Instagram insights"
          : "Analytics isn't enabled yet"
      }
    >
      <p className="max-w-sm text-sm text-muted-foreground">
        {status === "reconnect_required"
          ? "Reconnect your Instagram account and allow insights access to see how your content performs."
          : "Analytics access needs to be enabled for your workspace. Contact support to get started."}
      </p>
      {status === "reconnect_required" && (
        <Button disabled={busy} onClick={() => void reconnect(accountId)}>
          Reconnect Instagram
        </Button>
      )}
      {status === "not_enabled" && (
        <a
          href={contactHref("Instagram analytics access")}
          className={buttonVariants({ variant: "outline" })}
        >
          Contact support
        </a>
      )}
    </EmptyState>
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

function PostDetails({ accountId }: { accountId: string }) {
  const store = useInsightsStore()
  const detail = store.postReport?.status === "ready" ? store.postReport : null
  return (
    <Dialog
      open={Boolean(store.postId)}
      onOpenChange={(open) => {
        if (!open) store.closePost()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <div className="grid gap-1.5 pr-8">
          <DialogTitle>
            {detail ? kindLabels[detail.post.kind] : "Content"} performance
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {detail?.post.caption ??
              "Lifetime metrics and view history for this content."}
          </DialogDescription>
        </div>
        {store.postLoading && <Loading className="min-h-64" />}
        <ErrorBanner
          message={store.postError}
          retry={() => {
            if (store.postId) void store.openPost(store.postId)
          }}
        />
        {store.postReport && store.postReport.status !== "ready" && (
          <AccessNotice
            status={store.postReport.status}
            accountId={accountId}
          />
        )}
        {detail && (
          <div className="grid gap-6">
            <dl className="grid grid-cols-3 gap-x-5 gap-y-4 sm:grid-cols-6">
              {(
                [
                  "views",
                  "reach",
                  "likes",
                  "comments",
                  "saves",
                  "shares",
                ] as const
              ).map((key) => (
                <div key={key} className="grid gap-1">
                  <dt className="text-xs text-muted-foreground capitalize">
                    {key}
                  </dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {count(detail.post.metrics[key])}
                  </dd>
                </div>
              ))}
            </dl>
            {detail.post.kind === "reel" && (
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
                  View on Instagram <ExternalLink aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function Analytics() {
  const workspace = useWorkspaceStore()
  const store = useInsightsStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const account =
    workspace.accounts.find((item) => item.id === selectedId) ??
    workspace.accounts[0]
  const workspaceId = workspace.workspace?.id
  const accountId = account?.id
  const show = store.show
  const clear = store.clear
  useEffect(() => {
    if (workspaceId && accountId) void show(workspaceId, accountId)
  }, [workspaceId, accountId, show])
  useEffect(() => clear, [workspaceId, clear])
  const current =
    store.workspaceId === workspaceId && store.accountId === account?.id
  const report = current ? store.report : null
  const ready = report?.status === "ready" ? report : null
  const loading =
    Boolean(account) &&
    (!current || store.status === "loading" || store.status === "idle")

  return (
    <Page
      title="Analytics"
      actions={
        account && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading || (current && store.timingLoading)}
            onClick={() => void store.refresh()}
          >
            <RefreshCw
              aria-hidden="true"
              className={
                loading || (current && store.timingLoading)
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }
            />
            Refresh
          </Button>
        )
      }
    >
      {!account ? (
        <EmptyState
          icon={<ChartNoAxesCombined />}
          title="See how your Instagram content performs"
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            Connect a Business or Creator account to see views, reach,
            engagement, and reel watch time.
          </p>
          <Button
            disabled={workspace.busy}
            onClick={() => void workspace.connect()}
          >
            Connect Instagram
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar src={account.profilePictureUrl} name={account.username} />
              <label className="sr-only" htmlFor="analytics-account">
                Instagram account
              </label>
              <NativeSelect
                id="analytics-account"
                className="max-w-56"
                value={account.id}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {workspace.accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    @{item.username}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Period
              <NativeSelect
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
            </label>
          </div>
          <ErrorBanner
            message={current ? store.error : null}
            retry={() => void store.load()}
          />
          {loading && <Loading className="min-h-96" />}
          {report && report.status !== "ready" && (
            <AccessNotice status={report.status} accountId={account.id} />
          )}
          {ready && (
            <>
              <dl className="grid grid-cols-2 gap-y-6 border-y py-6 sm:grid-cols-4 sm:divide-x">
                {[
                  ["Views", ready.summary.views],
                  ["Accounts reached", ready.summary.reach],
                  ["Interactions", ready.summary.totalInteractions],
                  ["Accounts engaged", ready.summary.accountsEngaged],
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
              <section
                className="grid gap-5"
                aria-labelledby="reach-chart-title"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="reach-chart-title" className="text-sm font-semibold">
                    Reach over time
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Account performance
                  </span>
                </div>
                <DitherChart
                  points={ready.dailyReach}
                  label="Accounts reached"
                  description="Unique accounts reached each day (UTC)"
                />
              </section>
              <PostingTimes
                utc={store.timingUtc}
                onUtcChange={store.setTimingUtc}
                report={store.timing}
                loading={store.timingLoading}
                error={store.timingError}
                retry={() => void store.loadTiming()}
                notice={
                  store.timing && store.timing.status !== "ready" ? (
                    <AccessNotice
                      status={store.timing.status}
                      accountId={account.id}
                    />
                  ) : null
                }
              />
              <ContentPerformance
                loading={store.contentLoading}
                error={store.contentError}
                retry={() => void store.loadContent()}
                report={ready}
                sort={store.sort}
                onSort={(sort) => void store.order(sort)}
                onPage={(page) => void store.paginate(page)}
                onOpen={(id) => void store.openPost(id)}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Instagram insights can be delayed by up to 48 hours. A dash
                means a metric hasn't been reported. Account reach counts unique
                accounts for the period and may differ from the sum of daily
                reach.
                {ready.contentUpdatedAt && (
                  <span className="ml-1">
                    Content last synced {timeAgo(ready.contentUpdatedAt)}.
                  </span>
                )}
              </p>
            </>
          )}
          <PostDetails accountId={account.id} />
        </>
      )}
    </Page>
  )
}
