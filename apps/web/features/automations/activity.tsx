"use client"

import { useEffect } from "react"
import { MessageCircle } from "lucide-react"
import type { DmDeliveryStatus } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  Loading,
  Page,
} from "@/components/interface"
import { count, timeAgo } from "@/lib/format"
import { useActivityStore } from "@/stores/editor-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

const PAGE_SIZE = 25

const DM_STATUS: Record<DmDeliveryStatus, { label: string; dot: string }> = {
  sent: { label: "Sent", dot: "bg-emerald-500" },
  // The opening DM went out; the link follows when they tap its button.
  gated: { label: "Waiting for tap", dot: "bg-amber-400" },
  pending: { label: "Scheduled", dot: "bg-muted-foreground/40" },
  skipped: { label: "Skipped", dot: "bg-muted-foreground/40" },
  failed: { label: "Failed", dot: "bg-destructive" },
}

export function Activity({ id }: { id: string }) {
  const activity = useActivityStore()
  const automation = useWorkspaceStore((store) =>
    store.automations.find((item) => item.id === id)
  )
  const stats = useWorkspaceStore((store) => store.stats?.[id])
  const loadStats = useWorkspaceStore((store) => store.loadStats)
  const load = activity.load
  useEffect(() => {
    void load(id)
    void loadStats()
  }, [id, load, loadStats])
  const page = activity.page
  const summary = [
    { label: "Comments", value: count(stats?.triggered) },
    { label: "DMs sent", value: count(stats?.dmsSent) },
    { label: "Link clicks", value: count(stats?.linkClicks) },
    { label: "Failed", value: count(stats?.dmsFailed) },
  ]
  return (
    <Page title={automation?.name ?? "Activity"} back="/automations">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="grid gap-1">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <ErrorBanner
        message={activity.error}
        retry={() => void activity.load(id, activity.offset)}
      />
      {activity.busy ? (
        <Loading />
      ) : page && page.entries.length === 0 ? (
        <EmptyState icon={<MessageCircle />} title="No comments yet">
          <p className="text-sm text-muted-foreground">
            Comments that match this automation show up here.
          </p>
        </EmptyState>
      ) : (
        page && (
          <section className="grid gap-4">
            <div className="divide-y text-sm">
              <div className="-mx-3 flex items-center gap-4 px-3 pb-2 text-xs text-muted-foreground">
                <span className="w-44">Person</span>
                <span className="flex-1">Comment</span>
                <span className="w-48">DM</span>
                <span className="w-14 text-right">Clicks</span>
                <span className="w-20 text-right">When</span>
              </div>
              {page.entries.map((entry) => {
                const status = DM_STATUS[entry.dmStatus]
                const person =
                  entry.commenterUsername ?? entry.commenterName ?? "Unknown"
                return (
                  <div
                    key={entry.id}
                    className="-mx-3 flex items-center gap-4 px-3 py-3"
                  >
                    <div className="flex w-44 min-w-0 items-center gap-2.5">
                      <Avatar src={null} name={person} className="size-7" />
                      <span className="truncate font-medium">
                        {entry.commenterUsername
                          ? `@${entry.commenterUsername}`
                          : person}
                      </span>
                    </div>
                    <p
                      className="min-w-0 flex-1 truncate text-muted-foreground"
                      title={entry.commentText ?? undefined}
                    >
                      {entry.commentText ?? "—"}
                    </p>
                    <div className="grid w-48 gap-0.5">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn("size-1.5 rounded-full", status.dot)}
                        />
                        {status.label}
                      </span>
                      {entry.dmError && (
                        <span
                          className={cn(
                            "truncate pl-3.5 text-xs",
                            entry.dmStatus === "failed"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                          title={entry.dmError}
                        >
                          {entry.dmError}
                        </span>
                      )}
                    </div>
                    <span className="w-14 text-right tabular-nums">
                      {count(entry.linkClicks)}
                    </span>
                    <span
                      className="w-20 text-right text-muted-foreground"
                      title={new Date(entry.occurredAt).toLocaleString()}
                    >
                      {timeAgo(entry.occurredAt)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
              {activity.offset + 1}–{activity.offset + page.entries.length} of{" "}
              {page.total}
              <Button
                variant="secondary"
                size="sm"
                disabled={activity.offset === 0}
                onClick={() =>
                  void activity.load(
                    id,
                    Math.max(0, activity.offset - PAGE_SIZE)
                  )
                }
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!page.hasMore}
                onClick={() =>
                  void activity.load(id, activity.offset + PAGE_SIZE)
                }
              >
                Next
              </Button>
            </div>
          </section>
        )
      )}
    </Page>
  )
}
