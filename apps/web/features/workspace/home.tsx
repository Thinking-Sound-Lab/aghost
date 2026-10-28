"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { INSIGHT_PERIODS, type InsightPeriod } from "@workspace/api/contract"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { ErrorBanner, Page } from "@/components/interface"
import { Instagram } from "@/components/instagram-icon"
import { AutomationRows } from "@/features/automations/automation-list"
import { AutomationTotals } from "@/features/automations/automation-table"
import { SetOverview, useSetOverview } from "@/features/insights/set-overview"
import { count } from "@/lib/format"
import { useAuthStore } from "@/stores/auth-store"
import { useOverviewStore } from "@/stores/overview-store"
import {
  accountsIn,
  automationsIn,
  useActiveSet,
} from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

function Overview() {
  const socialSet = useActiveSet()
  const store = useOverviewStore()
  useSetOverview()

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
      <SetOverview />
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
      <AutomationTotals
        active={count(
          automations.filter((item) => item.status === "active").length
        )}
        dmsSent={total("dmsSent")}
        linkClicks={total("linkClicks")}
      />
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
