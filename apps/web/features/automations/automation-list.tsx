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
import { Switch } from "@workspace/ui/components/switch"
import {
  EmptyState,
  ErrorBanner,
  Page,
  SearchInput,
} from "@/components/interface"
import { count } from "@/lib/format"
import { automationsIn, useActiveSet } from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

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
    <div className="divide-y">
      <div className="-mx-3 flex items-center gap-4 px-3 pb-2 text-xs text-muted-foreground">
        <span className="flex-1">Name</span>
        <span className="w-20 text-right">DMs sent</span>
        <span className="w-20 text-right">Clicks</span>
        <span className="w-[4.5rem]" />
      </div>
      {items.map((item) => {
        const stats = store.stats?.[item.id]
        return (
          <div
            key={item.id}
            className="-mx-3 flex items-center gap-4 px-3 py-3 transition-colors hover:bg-muted/60"
          >
            <Link href={`/automations/${item.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {summary(item)}
              </p>
            </Link>
            <span className="w-20 text-right text-sm tabular-nums">
              {count(stats?.dmsSent)}
            </span>
            <span className="w-20 text-right text-sm tabular-nums">
              {count(stats?.linkClicks)}
            </span>
            <Switch
              checked={item.status === "active"}
              disabled={store.busy}
              aria-label={`${item.name} is ${item.status}`}
              onCheckedChange={() => void store.toggle(item)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${item.name} actions`}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={() => router.push(`/automations/${item.id}`)}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/automations/${item.id}/activity`)
                  }
                >
                  Activity
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    useWorkspaceStore.setState({ pendingDelete: item.id })
                  }
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
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
    </div>
  )
}
