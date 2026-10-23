"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { InsightPoint } from "@workspace/api/contract"
import { count } from "@/lib/format"
import { BAYER, DENSITIES } from "./dither-pattern"

const HEIGHT = 220
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

function dateLabel(date: string) {
  return dateFormat.format(new Date(`${date}T00:00:00Z`))
}

export function DitherChart({
  points,
  label,
  description,
}: {
  points: InsightPoint[]
  label: string
  description: string
}) {
  const id = useId().replaceAll(":", "")
  const [active, setActive] = useState<number | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const reported = points.filter((point) => point.value !== null)
  const hasData = reported.length > 0
  useEffect(() => {
    const element = container.current
    if (!element) return
    // One SVG unit per CSS pixel keeps the dither square at every screen size.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(1, Math.round(entry.contentRect.width)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasData])
  if (!reported.length)
    return (
      <div className="grid h-64 place-content-center gap-1 rounded-md border border-dashed px-6 text-center">
        <p className="text-sm font-medium">No history reported yet</p>
        <p className="text-xs text-muted-foreground">
          New data can take up to 48 hours to appear.
        </p>
      </div>
    )

  const maximum = Math.max(
    4,
    Math.ceil(Math.max(...reported.map((point) => point.value!)) / 4) * 4
  )
  const x = (index: number) =>
    points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
  const y = (value: number) => HEIGHT - 8 - (value / maximum) * (HEIGHT - 16)
  const runs: { x: number; y: number }[][] = []
  let run: { x: number; y: number }[] = []
  for (const [index, point] of points.entries()) {
    if (point.value === null) {
      if (run.length) runs.push(run)
      run = []
    } else run.push({ x: x(index), y: y(point.value) })
  }
  if (run.length) runs.push(run)
  const line = runs
    .map((items) =>
      items
        .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
        .join(" ")
    )
    .join(" ")
  const area = runs
    .filter((items) => items.length > 1)
    .map(
      (items) =>
        `M${items[0]!.x},${HEIGHT - 8} ${items.map((point) => `L${point.x},${point.y}`).join(" ")} L${items.at(-1)!.x},${HEIGHT - 8} Z`
    )
    .join(" ")
  const selected = active === null ? null : (points[active] ?? null)
  const tooltipWidth = Math.min(216, Math.max(0, width - 16))
  const selectedY = selected?.value != null ? y(selected.value) : HEIGHT / 2
  const tooltipLeft =
    active === null
      ? 8
      : Math.max(
          8,
          Math.min(x(active) - tooltipWidth / 2, width - tooltipWidth - 8)
        )
  // Keep the label next to its point, flipping below peaks and inside the edges.
  const tooltipTop = selectedY < 76 ? selectedY + 12 : selectedY - 68

  function inspect(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const position = (event.clientX - bounds.left) / bounds.width
    setActive(
      Math.max(
        0,
        Math.min(points.length - 1, Math.round(position * (points.length - 1)))
      )
    )
  }

  return (
    <figure className="grid gap-4" aria-label={label}>
      <figcaption className="text-xs text-muted-foreground">
        {description}
      </figcaption>
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className="relative mb-7 w-10 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums"
        >
          {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
            <span
              key={fraction}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(y(maximum * fraction) / HEIGHT) * 100}%` }}
            >
              {compact.format(maximum * fraction)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div
            ref={container}
            role="group"
            tabIndex={0}
            aria-label={`${label}. Hover, tap, or use left and right arrow keys to inspect each day.`}
            className="relative rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            onPointerMove={inspect}
            onPointerDown={inspect}
            onPointerLeave={(event) => {
              if (event.pointerType !== "touch") setActive(null)
            }}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible"))
                setActive(points.length - 1)
            }}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return
              event.preventDefault()
              setActive((current) =>
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? points.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          points.length - 1,
                          (current ?? points.length - 1) +
                            (event.key === "ArrowRight" ? 1 : -1)
                        )
                      )
              )
            }}
          >
            <svg
              viewBox={`0 0 ${width} ${HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              className="h-55 w-full overflow-visible text-foreground"
            >
              <defs>
                {DENSITIES.map((density, band) => (
                  <pattern
                    key={density}
                    id={`${id}-tone-${band}`}
                    patternUnits="userSpaceOnUse"
                    width="8"
                    height="8"
                  >
                    {BAYER.map(
                      (threshold, pixel) =>
                        threshold < density && (
                          <rect
                            key={pixel}
                            x={(pixel % 4) * 2}
                            y={Math.floor(pixel / 4) * 2}
                            width="1"
                            height="1"
                            fill="currentColor"
                            shapeRendering="crispEdges"
                          />
                        )
                    )}
                  </pattern>
                ))}
                <clipPath id={`${id}-area`}>
                  <path d={area} />
                </clipPath>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <line
                  key={fraction}
                  x1="0"
                  x2={width}
                  y1={y(maximum * fraction)}
                  y2={y(maximum * fraction)}
                  stroke="var(--border)"
                  strokeDasharray="2 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <g clipPath={`url(#${id}-area)`} opacity=".6">
                {DENSITIES.map((density, band) => (
                  <rect
                    key={density}
                    x="0"
                    y={(band * HEIGHT) / 4}
                    width={width}
                    height={HEIGHT / 4}
                    fill={`url(#${id}-tone-${band})`}
                  />
                ))}
              </g>
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
              {runs
                .filter((items) => items.length === 1)
                .map((items, index) => (
                  <rect
                    key={index}
                    x={items[0]!.x - 2}
                    y={items[0]!.y - 2}
                    width="4"
                    height="4"
                    fill="currentColor"
                  />
                ))}
              {selected && active !== null && (
                <g>
                  <line
                    x1={x(active)}
                    x2={x(active)}
                    y1="0"
                    y2={HEIGHT}
                    stroke="currentColor"
                    opacity=".35"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                  {selected.value !== null && (
                    <circle
                      cx={x(active)}
                      cy={y(selected.value)}
                      r="3"
                      fill="currentColor"
                      stroke="var(--background)"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              )}
            </svg>
            {selected && (
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="pointer-events-none absolute z-10 grid h-14 content-center gap-1 rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md"
                style={{
                  left: tooltipLeft,
                  top: tooltipTop,
                  width: tooltipWidth,
                }}
              >
                <time
                  dateTime={selected.date}
                  className="text-[11px] text-muted-foreground"
                >
                  {dateLabel(selected.date)}
                </time>
                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 bg-foreground"
                  />
                  <span className="truncate text-muted-foreground">
                    {label}
                  </span>
                  <span className="ml-auto shrink-0 font-medium tabular-nums">
                    {selected.value === null
                      ? "Not reported"
                      : count(selected.value)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div
            aria-hidden="true"
            className="mt-3 flex justify-between gap-2 text-[11px] text-muted-foreground tabular-nums"
          >
            <span>{dateLabel(points[0]!.date)}</span>
            {points.length > 2 && (
              <span>
                {dateLabel(points[Math.floor((points.length - 1) / 2)]!.date)}
              </span>
            )}
            {points.length > 1 && <span>{dateLabel(points.at(-1)!.date)}</span>}
          </div>
        </div>
      </div>
      <details className="group text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span className="group-open:hidden">Show data table</span>
          <span className="hidden group-open:inline">Hide data table</span>
        </summary>
        <div className="mt-3 max-h-48 overflow-auto rounded-md border">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="px-3 py-2 font-medium">
                  Date (UTC)
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {label}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date} className="border-b last:border-0">
                  <th scope="row" className="px-3 py-1.5 font-normal">
                    {point.date}
                  </th>
                  <td className="px-3 py-1.5 text-right">
                    {point.value === null ? "Not reported" : count(point.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
