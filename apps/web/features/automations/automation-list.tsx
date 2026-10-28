"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Plus, Workflow } from "lucide-react"
import type { Automation } from "@workspace/api/contract"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  EmptyState,
  ErrorBanner,
  Page,
  SearchInput,
} from "@/components/interface"
import { automationsIn, useActiveSet } from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { AutomationTable } from "./automation-table"

function summary(item: Automation): string {
  const post = {
    any_post: "Any post",
    specific_post: "One post",
    scheduled_post: "Scheduled post",
  }[item.trigger.postScope]
  const words = item.keywords.length ? item.keywords.join(", ") : "Any word"
  return `${post} · ${words}`
}

export function AutomationList() {
  const store = useWorkspaceStore()
  const loadStats = store.loadStats
  useEffect(() => {
    void loadStats()
  }, [loadStats])
  const inSet = automationsIn(store.automations, store.accounts, useActiveSet())
  const query = store.query.trim().toLowerCase()
  // Matches the name or any trigger keyword.
  const items = inSet.filter((item) =>
    [item.name, ...item.keywords].some((text) =>
      text.toLowerCase().includes(query)
    )
  )
  return (
    <Page
      title="Automations"
      actions={
        <>
          <SearchInput
            label="Search automations"
            className="w-56"
            value={store.query}
            onChange={(query) => useWorkspaceStore.setState({ query })}
          />
          <Link href="/automations/new" className={buttonVariants()}>
            <Plus />
            New automation
          </Link>
        </>
      }
    >
      <ErrorBanner
        message={store.statsError}
        retry={() => void store.loadStats()}
      />
      <AutomationRows items={items} total={inSet.length} />
    </Page>
  )
}

/** The rows, with `total` the automations there are before any search. */
export function AutomationRows({
  items,
  total,
}: {
  items: Automation[]
  total: number
}) {
  const store = useWorkspaceStore()
  const router = useRouter()
  if (total === 0)
    return (
      <EmptyState icon={<Workflow />} title="No automations yet">
        <Link
          href="/automations/new"
          className={buttonVariants({ variant: "secondary" })}
        >
          Create one
        </Link>
      </EmptyState>
    )
  if (items.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No matches
      </p>
    )
  const pending = store.automations.find(
    (item) => item.id === store.pendingDelete
  )
  return (
    <>
      <AutomationTable
        rows={items.map((item) => ({
          id: item.id,
          name: item.name,
          summary: summary(item),
          status: item.status,
          dmsSent: store.stats?.[item.id]?.dmsSent,
          linkClicks: store.stats?.[item.id]?.linkClicks,
        }))}
        busy={store.busy}
        onToggle={(id) => {
          const item = items.find((automation) => automation.id === id)
          if (item) void store.toggle(item)
        }}
        href={(id) => `/automations/${id}`}
        actions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${row.name} actions`}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => router.push(`/automations/${row.id}`)}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/automations/${row.id}/activity`)}
              >
                Activity
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  useWorkspaceStore.setState({ pendingDelete: row.id })
                }
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      <Dialog
        open={pending !== undefined}
        onOpenChange={(open) => {
          if (!open) useWorkspaceStore.setState({ pendingDelete: null })
        }}
      >
        <DialogContent showCloseButton={false}>
          <div className="grid gap-1.5">
            <DialogTitle>Delete {pending?.name}?</DialogTitle>
            <DialogDescription>
              It stops replying on Instagram right away.
            </DialogDescription>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              Cancel
            </DialogClose>
            <DialogClose
              render={<Button variant="destructive" disabled={store.busy} />}
              onClick={() => pending && void store.removeAutomation(pending.id)}
            >
              Delete
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
