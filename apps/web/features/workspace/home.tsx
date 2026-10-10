"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Instagram } from "@/components/instagram-icon"
import { ErrorBanner, Page } from "@/components/interface"
import { AutomationRows } from "@/features/automations/automation-list"
import { count } from "@/lib/format"
import { useWorkspaceStore } from "@/stores/workspace-store"

export function Home() {
  const store = useWorkspaceStore()
  const loadStats = store.loadStats
  useEffect(() => {
    void loadStats()
  }, [loadStats])
  const connected = store.accounts.some((item) => item.status === "connected")
  function total(key: "dmsSent" | "linkClicks") {
    if (!store.stats) return "—"
    const values = store.automations.map(
      (item) => store.stats?.[item.id]?.[key]
    )
    if (values.some((value) => value == null)) return "—"
    return count(values.reduce<number>((sum, value) => sum + value!, 0))
  }
  const stats = [
    {
      label: "Active automations",
      value: store.automations.filter((item) => item.status === "active")
        .length,
    },
    { label: "DMs sent", value: total("dmsSent") },
    { label: "Link clicks", value: total("linkClicks") },
  ]
  return (
    <Page
      title="Home"
      actions={
        <Link href="/automations/new" className={buttonVariants()}>
          <Plus />
          New automation
        </Link>
      }
    >
      {!connected && (
        <div className="flex items-center gap-3 bg-muted px-5 py-4">
          <Instagram size={20} />
          <p className="mr-auto text-sm font-medium">
            Connect your Instagram account
          </p>
          <Button disabled={store.busy} onClick={() => void store.connect()}>
            Connect
          </Button>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="grid gap-1">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <ErrorBanner
        message={store.statsError}
        retry={() => void store.loadStats()}
      />
      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Automations</h2>
          <Link
            href="/automations"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <AutomationRows items={store.automations.slice(0, 5)} />
      </section>
    </Page>
  )
}
