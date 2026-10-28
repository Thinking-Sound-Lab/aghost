"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, Share2 } from "lucide-react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, ErrorBanner, Page } from "@/components/interface"
import { useCalendarStore } from "@/stores/calendar-store"
import { accountsIn, useActiveSet } from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { MonthGrid } from "./month-grid"

const monthName = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
})

export function Calendar() {
  const store = useCalendarStore()
  const socialSet = useActiveSet()
  const accounts = accountsIn(
    useWorkspaceStore((state) => state.accounts),
    socialSet
  )
  const { status, load } = store
  useEffect(() => {
    // Returning to the page shows what was published meanwhile.
    void load()
  }, [load])

  if (accounts.length === 0)
    return (
      <Page title="Calendar">
        <EmptyState icon={<Share2 />} title="Connect a channel first">
          <Link
            href="/settings#channels"
            className={buttonVariants({ variant: "secondary" })}
          >
            Go to settings
          </Link>
        </EmptyState>
      </Page>
    )

  // The calendar shows the set being shown; each post is one account's copy.
  const shown = new Set(accounts.map((account) => account.id))

  return (
    <Page
      title="Calendar"
      actions={
        <>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => void store.show(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void store.show(null)}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => void store.show(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <Link href="/calendar/new" className={buttonVariants()}>
            <Plus />
            New post
          </Link>
        </>
      }
    >
      <div className="-mt-4 flex items-center gap-3">
        <h2 className="text-base font-semibold" aria-live="polite">
          {monthName.format(store.month)}
        </h2>
        {status === "loading" && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>
      <ErrorBanner message={store.error} retry={() => void store.load()} />

      <MonthGrid
        month={store.month}
        posts={store.posts.filter((item) => shown.has(item.accountId))}
        accounts={accounts}
        ready={status === "ready"}
        postHref={(id) => `/calendar/${id}`}
        newPostHref={(day) => `/calendar/new?day=${day}`}
      />
    </Page>
  )
}
