"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ChartNoAxesCombined } from "lucide-react"
import type { InsightPeriod } from "@workspace/api/contract"
import { buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, ErrorBanner, Loading } from "@/components/interface"
import { contactHref } from "@/features/marketing/contact"
import { useOverviewStore } from "@/stores/overview-store"
import { accountsIn, useActiveSet } from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { ChannelOverview } from "./channel-overview"

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
  const accounts = useWorkspaceStore((state) => state.accounts)
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
        <ChannelOverview
          overview={ready}
          days={store.days}
          accounts={accounts}
        />
      )}
    </>
  )
}
