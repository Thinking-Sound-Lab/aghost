"use client"

import Link from "next/link"
import type { AutomationStatus } from "@workspace/api/contract"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { count } from "@/lib/format"

export type AutomationRow = {
  id: string
  name: string
  /** Which posts it answers and the words it listens for. */
  summary: string
  status: AutomationStatus
  dmsSent: number | null | undefined
  linkClicks: number | null | undefined
}

/** The automations with their counts and a switch to pause each one. */
export function AutomationTable({
  rows,
  busy,
  onToggle,
  href,
  actions,
}: {
  rows: AutomationRow[]
  busy: boolean
  onToggle: (id: string) => void
  /** Each row's page; without it the rows aren't links. */
  href?: (id: string) => string
  /** Controls after the switch, such as a menu. */
  actions?: (row: AutomationRow) => React.ReactNode
}) {
  return (
    <div className="divide-y">
      <div className="-mx-3 flex items-center gap-4 px-3 pb-2 text-xs text-muted-foreground">
        <span className="flex-1">Name</span>
        <span className="w-20 text-right">DMs sent</span>
        <span className="w-20 text-right">Clicks</span>
        <span className={actions ? "w-[4.5rem]" : "w-8"} />
      </div>
      {rows.map((row) => {
        const name = (
          <>
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.summary}
            </p>
          </>
        )
        return (
          <div
            key={row.id}
            className={cn(
              "-mx-3 flex items-center gap-4 px-3 py-3",
              href && "transition-colors hover:bg-muted/60"
            )}
          >
            {href ? (
              <Link href={href(row.id)} className="min-w-0 flex-1">
                {name}
              </Link>
            ) : (
              <div className="min-w-0 flex-1">{name}</div>
            )}
            <span className="w-20 text-right text-sm tabular-nums">
              {count(row.dmsSent)}
            </span>
            <span className="w-20 text-right text-sm tabular-nums">
              {count(row.linkClicks)}
            </span>
            <Switch
              checked={row.status === "active"}
              disabled={busy}
              aria-label={`${row.name} is ${row.status}`}
              onCheckedChange={() => onToggle(row.id)}
            />
            {actions?.(row)}
          </div>
        )
      })}
    </div>
  )
}

/** How many automations run, and what they sent and got clicked. */
export function AutomationTotals({
  active,
  dmsSent,
  linkClicks,
}: {
  active: string
  dmsSent: string
  linkClicks: string
}) {
  return (
    <dl className="grid grid-cols-3 gap-6">
      {[
        ["Active", active],
        ["DMs sent", dmsSent],
        ["Link clicks", linkClicks],
      ].map(([label, value]) => (
        <div key={label} className="grid gap-1">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
