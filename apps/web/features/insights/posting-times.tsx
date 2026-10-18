"use client"

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  INSIGHT_TIMING_MIN_POSTS,
  type InsightTimingReport,
} from "@workspace/api/contract"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { cn } from "@workspace/ui/lib/utils"
import { ErrorBanner, Loading } from "@/components/interface"
import { BAYER, DENSITIES } from "./dither-pattern"
import {
  localPostingSlots,
  suggestedPostingSlots,
  WEEKDAYS,
  type LocalPostingSlot,
} from "./posting-time-slots"

const average = new Intl.NumberFormat("en", { maximumFractionDigits: 1 })
const hours = Array.from({ length: 24 }, (_, hour) => hour)
const masks = [...DENSITIES].reverse().map((density) => {
  const pixels = BAYER.map((value, index) =>
    value < density
      ? `<rect x="${(index % 4) * 2}" y="${Math.floor(index / 4) * 2}" width="1" height="1" fill="white"/>`
      : ""
  ).join("")
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">${pixels}</svg>`)}")`
})

function Tone({ level }: { level: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-foreground"
      style={
        {
          maskImage: masks[level],
          maskRepeat: "repeat",
          maskSize: "8px 8px",
        } as CSSProperties
      }
    />
  )
}

function slotDescription(slot: LocalPostingSlot) {
  return `${slot.dayLabel}, ${slot.dateLabel}, ${slot.timeLabel}: ${average.format(slot.averageEngagement)} average interactions from ${slot.postCount} ${slot.postCount === 1 ? "post" : "posts"}${slot.postCount < INSIGHT_TIMING_MIN_POSTS ? ", early sample" : ""}`
}

function TimingHeatmap({
  slots,
  timeZone,
}: {
  slots: LocalPostingSlot[]
  timeZone: string
}) {
  const id = useId()
  const [active, setActive] = useState<string | null>(null)
  const maximum = Math.max(1, ...slots.map((slot) => slot.averageEngagement))
  const cells = new Map<string, LocalPostingSlot[]>()
  for (const slot of slots) {
    const key = `${slot.localDay}:${slot.localHour}`
    cells.set(key, [...(cells.get(key) ?? []), slot])
  }
  return (
    <figure
      className="grid gap-3"
      aria-label={`Posting-time engagement in ${timeZone}`}
    >
      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-136 table-fixed border-separate border-spacing-1 text-xs">
          <caption className="sr-only">
            Average interactions per post, grouped by weekday and local start
            hour. Empty cells have no history. Focus a populated cell to see
            exact times and sample counts.
          </caption>
          <thead>
            <tr>
              <th className="w-10" scope="col">
                <span className="sr-only">Day</span>
              </th>
              {hours.map((hour) => (
                <th
                  key={hour}
                  scope="col"
                  className="h-5 text-left text-[10px] font-normal text-muted-foreground tabular-nums"
                >
                  <span className={hour % 3 ? "sr-only" : undefined}>
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day, dayIndex) => (
              <tr key={day}>
                <th
                  scope="row"
                  className="text-left font-normal text-muted-foreground"
                >
                  {day}
                </th>
                {hours.map((hour) => {
                  const key = `${dayIndex}:${hour}`
                  const items = cells.get(key)
                  const value = items
                    ? Math.max(...items.map((item) => item.averageEngagement))
                    : null
                  const level =
                    value === null
                      ? 0
                      : Math.min(3, Math.floor((value / maximum) * 4))
                  return (
                    <td key={hour} className="relative p-0">
                      {items ? (
                        <>
                          <button
                            type="button"
                            aria-label={items.map(slotDescription).join("; ")}
                            aria-describedby={
                              active === key ? `${id}-${key}` : undefined
                            }
                            className="relative block h-6 w-full rounded-xs border border-foreground/15 bg-muted/40 outline-none hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                            onPointerEnter={() => setActive(key)}
                            onPointerDown={() => setActive(key)}
                            onPointerLeave={(event) => {
                              if (event.pointerType !== "touch") setActive(null)
                            }}
                            onFocus={() => setActive(key)}
                            onBlur={() => setActive(null)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") setActive(null)
                            }}
                          >
                            <Tone level={level} />
                          </button>
                          {active === key && (
                            <div
                              role="tooltip"
                              id={`${id}-${key}`}
                              className={cn(
                                "pointer-events-none absolute z-20 grid w-60 gap-2 rounded-md border bg-popover p-3 text-popover-foreground shadow-md",
                                dayIndex < 3
                                  ? "top-full mt-2"
                                  : "bottom-full mb-2",
                                hour < 6
                                  ? "left-0"
                                  : hour > 17
                                    ? "right-0"
                                    : "left-1/2 -translate-x-1/2"
                              )}
                            >
                              {items.map((slot) => (
                                <div key={slot.key} className="grid gap-1">
                                  <span className="font-medium">
                                    {slot.dayLabel} · {slot.timeLabel}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {average.format(slot.averageEngagement)}{" "}
                                    avg. interactions · {slot.postCount}{" "}
                                    {slot.postCount === 1 ? "post" : "posts"}
                                  </span>
                                  {slot.postCount <
                                    INSIGHT_TIMING_MIN_POSTS && (
                                    <span className="text-muted-foreground">
                                      Early sample
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="block h-6 rounded-xs bg-muted/50">
                          <span className="sr-only">No history</span>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Local start hour · hover or focus a cell for details</span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-xs bg-muted/50" /> No history{" "}
          <span className="ml-2">Less</span>
          {masks.map((_, level) => (
            <span
              key={level}
              className="relative size-3 overflow-hidden rounded-xs bg-muted/40"
            >
              <Tone level={level} />
            </span>
          ))}
          More
        </span>
      </figcaption>
    </figure>
  )
}

export function PostingTimes({
  report,
  loading,
  error,
  retry,
  notice,
}: {
  report: InsightTimingReport | null
  loading: boolean
  error: string | null
  retry: () => void
  notice: ReactNode
}) {
  const [localZone, setLocalZone] = useState<string | null>(null)
  const [utc, setUtc] = useState(false)
  useEffect(
    () => setLocalZone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    []
  )
  const timeZone = utc ? "UTC" : localZone
  const slots = useMemo(
    () =>
      report?.status === "ready" && timeZone
        ? localPostingSlots(report, timeZone)
        : [],
    [report, timeZone]
  )
  const suggestions = suggestedPostingSlots(slots)
  const ready = report?.status === "ready" && timeZone
  return (
    <section
      className="grid gap-5 border-t pt-6"
      aria-labelledby="posting-times-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="posting-times-title" className="text-sm font-semibold">
            Best time to post
          </h2>
          <p className="text-xs text-muted-foreground">
            Based on all available posting history.
          </p>
        </div>
        {localZone && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Time zone
            <NativeSelect
              className="max-w-48 text-xs"
              value={utc ? "UTC" : "local"}
              onChange={(event) => setUtc(event.target.value === "UTC")}
            >
              <option value="local">{localZone.replaceAll("_", " ")}</option>
              {localZone !== "UTC" && <option value="UTC">UTC</option>}
            </NativeSelect>
          </label>
        )}
      </header>
      <ErrorBanner message={error} retry={retry} />
      {(loading || !localZone) && <Loading className="min-h-40" />}
      {!loading && notice}
      {!loading && ready && (
        <>
          {suggestions.length ? (
            <ol className="grid gap-3 sm:grid-cols-3">
              {suggestions.map((slot, index) => (
                <li
                  key={slot.key}
                  className="grid content-start gap-2 rounded-md border p-4"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">{slot.dayLabel}</span>
                    <span className="text-muted-foreground tabular-nums">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {slot.timeLabel}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {average.format(slot.averageEngagement)} avg. interactions
                    <br />
                    {slot.postCount} posts in this slot
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="grid gap-1 rounded-md border border-dashed p-5">
              <p className="text-sm font-medium">
                {!slots.length
                  ? "No posting history yet"
                  : slots.some(
                        (slot) => slot.postCount >= INSIGHT_TIMING_MIN_POSTS
                      )
                    ? "No engagement signal yet"
                    : "More posting history needed"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Suggestions appear when a time slot has at least{" "}
                {INSIGHT_TIMING_MIN_POSTS} posts and reported engagement. Keep
                trying different times as your history grows.
              </p>
            </div>
          )}
          {slots.length > 0 && (
            <TimingHeatmap key={timeZone} slots={slots} timeZone={timeZone} />
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Suggestions compare average likes, comments, saves, and shares per
            post, with at least {INSIGHT_TIMING_MIN_POSTS} posts per slot. Times
            are converted for the next 7 days in {timeZone}. Past engagement is
            a starting point for testing.
          </p>
        </>
      )}
    </section>
  )
}
