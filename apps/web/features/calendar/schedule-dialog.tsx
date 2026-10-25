"use client"

import { Eye, Loader2 } from "lucide-react"
import {
  PLATFORMS,
  PLATFORM_RULES,
  POST_LIMITS,
  accountLabel,
  type Account,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { Switch } from "@workspace/ui/components/switch"
import { ChannelAvatar, PlatformIcon } from "@/components/platform-icon"
import {
  earliestPost,
  localInput,
  zoneLabel,
} from "@/features/calendar/schedule-time"
import { useComposerStore } from "@/stores/composer-store"
import { canConnect, useWorkspaceStore } from "@/stores/workspace-store"

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const twelveHour = /^h1[12]$/.test(
  new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions()
    .hourCycle ?? ""
)
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" })
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "short" })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
const pad = (value: number) => String(value).padStart(2, "0")

/** "in 3 hours", "tomorrow", "in 4 days". */
function fromNow(date: Date): string {
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 48) return relative.format(hours, "hour")
  return relative.format(Math.round(hours / 24), "day")
}

/** Where the post goes, at a time on the day chosen in the calendar. */
export function ScheduleDialog({
  open,
  onOpenChange,
  formId,
  accounts,
  busy,
  saving,
  onPreview,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The composer's form, which this dialog submits. */
  formId: string
  /** The accounts the post can go to. */
  accounts: Account[]
  busy: boolean
  saving: boolean
  onPreview: (accountId: string) => void
}) {
  const composer = useComposerStore()
  const workspace = useWorkspaceStore()
  const { draft, fields, post } = composer
  const when = new Date(draft.scheduledAt)
  const tooSoon = when < earliestPost()
  const missing = post
    ? []
    : PLATFORMS.filter(
        (platform) => !accounts.some((item) => item.platform === platform)
      )
  const room = canConnect(workspace)
  const count = draft.accountIds.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="grid gap-4 p-6 pb-5">
          <div className="grid gap-1.5 pr-8">
            <DialogTitle>Schedule</DialogTitle>
            <DialogDescription>
              All times in {zoneLabel(timeZone)}.
            </DialogDescription>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-3">
            <span
              aria-hidden="true"
              className="grid w-14 shrink-0 overflow-hidden rounded-lg border bg-card text-center"
            >
              <span className="bg-secondary py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {monthFormat.format(when)}
              </span>
              <span className="py-1.5 text-xl leading-none font-semibold tabular-nums">
                {when.getDate()}
              </span>
            </span>
            <div className="grid min-w-0 flex-1 justify-items-start gap-0.5">
              {composer.day ? (
                <p className="truncate text-sm font-medium">
                  {dayFormat.format(when)}
                </p>
              ) : (
                // Without a calendar day to keep, the date can change too.
                <input
                  type="date"
                  aria-label="Date"
                  disabled={busy}
                  min={localInput(new Date()).slice(0, 10)}
                  value={draft.scheduledAt.slice(0, 10)}
                  onChange={(event) => {
                    if (event.target.value)
                      composer.patch({
                        scheduledAt: `${event.target.value}${draft.scheduledAt.slice(10)}`,
                      })
                  }}
                  className="h-8 rounded-md bg-secondary px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {tooSoon ? "Too soon to publish" : fromNow(when)}
              </p>
            </div>
            <TimePicker
              value={draft.scheduledAt}
              disabled={busy}
              onChange={(scheduledAt) => composer.patch({ scheduledAt })}
            />
          </div>
          {(tooSoon || fields.scheduledFor) && (
            <p role="alert" className="-mt-1 text-xs text-destructive">
              {fields.scheduledFor ??
                (!hasTimeLeft(draft.scheduledAt)
                  ? `There's no time left to publish on this day. Choose another day${composer.day ? " in the calendar" : ""}.`
                  : `Choose a time at least ${POST_LIMITS.minLeadMinutes} minutes from now.`)}
            </p>
          )}
        </div>
        <div
          role="group"
          aria-label="Publish to"
          className="max-h-80 overflow-y-auto border-t py-2"
        >
          {accounts.map((item) => {
            const on = draft.accountIds.includes(item.id)
            const name = PLATFORM_RULES[item.platform].name
            return (
              <div key={item.id} className="flex items-center gap-3 px-6 py-2">
                <Switch
                  checked={on}
                  aria-label={`Publish on ${name} as ${accountLabel(item)}`}
                  disabled={!!post || busy || item.status !== "connected"}
                  onCheckedChange={() => void composer.toggleAccount(item.id)}
                />
                <ChannelAvatar account={item} className="size-8" />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-medium">
                    {item.displayName || item.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {accountLabel(item).startsWith("@")
                      ? accountLabel(item)
                      : name}
                  </p>
                </div>
                {on && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground"
                    onClick={() => onPreview(item.id)}
                  >
                    <Eye />
                    Preview
                  </Button>
                )}
              </div>
            )
          })}
          {missing.map((platform) => (
            <div key={platform} className="flex items-center gap-3 px-6 py-2">
              <span className="w-8" />
              <span className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
                <PlatformIcon platform={platform} />
              </span>
              <p className="flex-1 text-sm text-muted-foreground">
                {PLATFORM_RULES[platform].name}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={!room || workspace.busy}
                title={
                  room
                    ? `Connect ${PLATFORM_RULES[platform].name} in a new tab`
                    : "Your plan has no room for another channel"
                }
                onClick={() => void composer.connect(platform)}
              >
                Connect
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t px-6 py-4">
          <p className="mr-auto text-xs text-muted-foreground">
            {count === 0
              ? "Choose a channel"
              : `${count} ${count === 1 ? "channel" : "channels"}`}
          </p>
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={
              busy || tooSoon || count === 0 || composer.uploads.length > 0
            }
          >
            {saving && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {post ? "Save changes" : "Schedule post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Five-minute steps, keeping a saved time that falls between them. */
function minuteSteps(minute: number): number[] {
  const steps = Array.from({ length: 12 }, (_, index) => index * 5)
  return steps.includes(minute)
    ? steps
    : [...steps, minute].sort((a, b) => a - b)
}

/** Whether the value's day still has a five-minute step to publish at. */
function hasTimeLeft(value: string): boolean {
  return new Date(`${value.split("T")[0]}T23:55`) >= earliestPost()
}

/** Hour, minute and, where the clock has them, AM and PM, on a fixed day. */
function TimePicker({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const [day, clock = "10:00"] = value.split("T")
  const [hour = 10, minute = 0] = clock.split(":").map(Number)
  const minutes = minuteSteps(minute)
  const earliest = earliestPost()
  const allowed = (h: number, m: number) =>
    new Date(`${day}T${pad(h)}:${pad(m)}`) >= earliest
  const hourOpen = (h: number) => minutes.some((m) => allowed(h, m))
  /** Keeps the minute when it is still allowed at the new hour. */
  function choose(h: number, m = minute) {
    const next = allowed(h, m)
      ? m
      : (minutes.find((step) => allowed(h, step)) ?? m)
    onChange(`${day}T${pad(h)}:${pad(next)}`)
  }
  const pm = hour >= 12
  /** The hours of the morning or the afternoon. */
  const half = (afternoon: boolean) =>
    Array.from({ length: 12 }, (_, index) => index + (afternoon ? 12 : 0))
  const hours = twelveHour
    ? half(pm)
    : Array.from({ length: 24 }, (_, index) => index)
  const field =
    "h-10 rounded-lg border-transparent bg-secondary pr-7 pl-3 text-base font-semibold tabular-nums"
  return (
    <div className="flex items-center gap-1.5">
      <NativeSelect
        aria-label="Hour"
        disabled={disabled}
        value={hour}
        onChange={(event) => choose(Number(event.target.value))}
        className={cn(field, "w-[4.5rem]")}
      >
        {hours.map((h) => (
          <option key={h} value={h} disabled={!hourOpen(h)}>
            {twelveHour ? h % 12 || 12 : pad(h)}
          </option>
        ))}
      </NativeSelect>
      <span aria-hidden="true" className="font-semibold text-muted-foreground">
        :
      </span>
      <NativeSelect
        aria-label="Minute"
        disabled={disabled}
        value={minute}
        onChange={(event) => choose(hour, Number(event.target.value))}
        className={cn(field, "w-[4.5rem]")}
      >
        {minutes.map((m) => (
          <option key={m} value={m} disabled={!allowed(hour, m)}>
            {pad(m)}
          </option>
        ))}
      </NativeSelect>
      {twelveHour && (
        <div
          role="radiogroup"
          aria-label="AM or PM"
          className="ml-1 flex gap-0.5 rounded-lg bg-secondary p-0.5"
        >
          {(["AM", "PM"] as const).map((label) => {
            const afternoon = label === "PM"
            const selected = afternoon === pm
            const target = (hour % 12) + (afternoon ? 12 : 0)
            const first = half(afternoon).find(hourOpen)
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled || first === undefined}
                onClick={() =>
                  choose(hourOpen(target) ? target : (first ?? target))
                }
                className={cn(
                  "h-9 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
                  selected &&
                    "bg-card font-medium text-foreground shadow-xs dark:bg-white/15"
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
