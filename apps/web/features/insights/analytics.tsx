"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChartNoAxesCombined, RefreshCw } from "lucide-react"
import {
  PLATFORMS,
  PLATFORM_RULES,
  accountLabel,
  type Account,
  type InsightPeriod,
  type InsightsUnavailable,
} from "@workspace/api/contract"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, ErrorBanner, Loading, Page } from "@/components/interface"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useInsightsStore } from "@/stores/insights-store"
import { useOverviewStore } from "@/stores/overview-store"
import { accountsIn, useActiveSet } from "@/stores/social-set-store"
import { contactHref } from "@/features/marketing/contact"
import {
  ChannelSummary,
  ChannelTabs,
  InstagramSummary,
  PostDialog,
  ReportNote,
} from "./channel-report"
import { ContentPerformance } from "./content-performance"
import { SetOverview, useSetOverview } from "./set-overview"

function AccessNotice({
  status,
  account,
}: InsightsUnavailable & { account: Account }) {
  const { reconnect, busy } = useWorkspaceStore()
  const { name } = PLATFORM_RULES[account.platform]
  return (
    <EmptyState
      icon={<ChartNoAxesCombined />}
      title={
        status === "reconnect_required"
          ? `Allow access to ${name} insights`
          : "Analytics isn't enabled yet"
      }
    >
      <p className="max-w-sm text-sm text-muted-foreground">
        {status === "reconnect_required"
          ? `Reconnect ${accountLabel(account)} and allow insights access to see how your content performs.`
          : "Analytics access needs to be enabled for your workspace. Contact support to get started."}
      </p>
      {status === "reconnect_required" && (
        <Button disabled={busy} onClick={() => void reconnect(account.id)}>
          Reconnect {name}
        </Button>
      )}
      {status === "not_enabled" && (
        <a
          href={contactHref("Analytics access")}
          className={buttonVariants({ variant: "outline" })}
        >
          Contact support
        </a>
      )}
    </EmptyState>
  )
}

function PostDetails({ account }: { account: Account }) {
  const store = useInsightsStore()
  const detail = store.postReport?.status === "ready" ? store.postReport : null
  return (
    <PostDialog
      open={Boolean(store.postId)}
      onClose={store.closePost}
      platform={account.platform}
      detail={detail}
    >
      {store.postLoading && <Loading className="min-h-64" />}
      <ErrorBanner
        message={store.postError}
        retry={() => {
          if (store.postId) void store.openPost(store.postId)
        }}
      />
      {store.postReport && store.postReport.status !== "ready" && (
        <AccessNotice status={store.postReport.status} account={account} />
      )}
    </PostDialog>
  )
}

/** Every channel of the set together, with how each one did. */
function AllChannels({ days }: { days: InsightPeriod }) {
  useSetOverview(days)
  return (
    <section
      aria-label="All channels"
      className="grid grid-cols-[minmax(0,1fr)] gap-6"
    >
      <SetOverview />
    </section>
  )
}

export function Analytics() {
  const workspace = useWorkspaceStore()
  const store = useInsightsStore()
  const overview = useOverviewStore()
  // "all", or the id of the channel shown.
  const [tab, setTab] = useState("all")
  // In the order the platforms take everywhere else, as in the All table.
  const accounts = accountsIn(workspace.accounts, useActiveSet()).sort(
    (a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform)
  )
  // A channel that left the set falls back to all of them.
  const account = accounts.find((item) => item.id === tab)
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
  const busy = account ? loading : overview.status === "loading"

  return (
    <Page
      title="Analytics"
      actions={
        accounts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void (account ? store.refresh() : overview.load())}
          >
            <RefreshCw
              aria-hidden="true"
              className={busy ? "animate-spin motion-reduce:animate-none" : ""}
            />
            Refresh
          </Button>
        )
      }
    >
      {accounts.length === 0 ? (
        <EmptyState
          icon={<ChartNoAxesCombined />}
          title="See how your content performs"
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            Connect a channel to see views, reach, engagement, and more.
          </p>
          <Link href="/settings#channels" className={buttonVariants()}>
            Connect a channel
          </Link>
        </EmptyState>
      ) : (
        <>
          <ChannelTabs
            accounts={accounts}
            selected={account?.id ?? null}
            onSelect={setTab}
            days={store.days}
            onPeriod={(days) => {
              // All channels follow the period through the page.
              if (account) void store.period(days)
              else useInsightsStore.setState({ days })
            }}
          />
          {account ? (
            <>
              <ErrorBanner
                message={current ? store.error : null}
                retry={() => void store.load()}
              />
              {loading && <Loading className="min-h-96" />}
              {report && report.status !== "ready" && (
                <AccessNotice status={report.status} account={account} />
              )}
              {ready?.platform !== "instagram" && ready && (
                <ChannelSummary report={ready} />
              )}
              {ready && (
                <>
                  {ready.platform === "instagram" && (
                    <InstagramSummary report={ready} />
                  )}
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
                  <ReportNote report={ready} />
                </>
              )}
              <PostDetails account={account} />
            </>
          ) : (
            <AllChannels days={store.days} />
          )}
        </>
      )}
    </Page>
  )
}
