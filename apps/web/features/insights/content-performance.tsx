"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Film,
  Images,
  ImageIcon,
} from "lucide-react"
import {
  PLATFORM_RULES,
  type ChannelMetric,
  type InsightPost,
  type InsightQuery,
  type InsightReport,
  type Platform,
} from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { count } from "@/lib/format"
import { ErrorBanner, Loading } from "@/components/interface"

export const kindLabels: Record<InsightPost["kind"], string> = {
  reel: "Reel",
  post: "Post",
  carousel: "Carousel",
  story: "Story",
  video: "Video",
  unknown: "Content",
}

export const metricLabels: Record<ChannelMetric, string> = {
  impressions: "Impressions",
  reach: "Reach",
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  clicks: "Clicks",
}

// The order metrics take on a platform other than Instagram, most telling first.
const ORDER: ChannelMetric[] = [
  "impressions",
  "views",
  "likes",
  "comments",
  "shares",
  "clicks",
  "saves",
  "reach",
]

/** The metrics a platform reports, in display order. */
export function metricsOf(platform: Platform): ChannelMetric[] {
  const reported = PLATFORM_RULES[platform].metrics
  return platform === "instagram"
    ? ["views", "reach", "saves", "shares"]
    : ORDER.filter((metric) => reported.includes(metric))
}

/** Engagement rate needs reach, which only some platforms report. */
function hasEngagement(platform: Platform): boolean {
  return PLATFORM_RULES[platform].metrics.includes("reach")
}

const SORT_LABELS: Record<InsightQuery["sort"], string> = {
  views: "Most views",
  reach: "Highest reach",
  saves: "Most saves",
  shares: "Most shares",
  impressions: "Most impressions",
  likes: "Most likes",
  comments: "Most comments",
  clicks: "Most clicks",
  date: "Newest first",
}
const published = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

export function percentage(value: number | null) {
  return value === null
    ? "—"
    : `${value.toLocaleString("en", { maximumFractionDigits: 1 })}%`
}

function Thumbnail({ post }: { post: InsightPost }) {
  const [failed, setFailed] = useState(false)
  const Icon =
    post.kind === "reel" || post.kind === "video"
      ? Film
      : post.kind === "carousel"
        ? Images
        : ImageIcon
  return (
    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
      {post.thumbnailUrl && !failed ? (
        <Image
          src={post.thumbnailUrl}
          fill
          unoptimized
          alt=""
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon className="size-4" aria-hidden="true" />
      )}
    </span>
  )
}

export function ContentPerformance({
  report,
  sort,
  onSort,
  onPage,
  onOpen,
  loading,
  error,
  retry,
}: {
  report: Extract<InsightReport, { status: "ready" }>
  sort: InsightQuery["sort"]
  onSort: (sort: InsightQuery["sort"]) => void
  onPage: (page: number) => void
  onOpen: (postId: string) => void
  loading: boolean
  error: string | null
  retry: () => void
}) {
  // Five metric columns at most keep the table readable.
  const columns = metricsOf(report.platform).slice(0, 5)
  const engagement = hasEngagement(report.platform)
  return (
    <section
      className="grid gap-4"
      aria-labelledby="content-performance-title"
      aria-busy={loading}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="content-performance-title" className="text-sm font-semibold">
            Content performance
          </h2>
          <p className="text-xs text-muted-foreground">
            Published in this period. Metrics are lifetime totals.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Sort by
          <NativeSelect
            value={sort}
            onChange={(event) =>
              onSort(event.target.value as InsightQuery["sort"])
            }
            className="text-xs"
          >
            {[...metricsOf(report.platform), "date" as const].map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </header>
      <ErrorBanner message={error} retry={retry} />
      {loading ? (
        <Loading className="min-h-40" />
      ) : error ? null : !report.posts.length ? (
        <div className="rounded-md border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No content found in this period</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a longer period, or check back after your next post syncs.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-160 text-left text-sm tabular-nums">
              <caption className="sr-only">
                Lifetime performance of content published in the selected
                period. Select content to see its details.
              </caption>
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Content
                  </th>
                  {[
                    ...columns.map((metric) => metricLabels[metric]),
                    ...(engagement ? ["Engagement"] : []),
                  ].map((label) => (
                    <th
                      scope="col"
                      key={label}
                      className="px-3 py-3 text-right font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <th
                      scope="row"
                      className="max-w-64 py-3 pr-3 pl-4 font-normal"
                    >
                      <button
                        onClick={() => onOpen(post.id)}
                        className="group flex w-full min-w-0 items-center gap-3 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        <Thumbnail post={post} />
                        <span className="grid min-w-0 gap-1">
                          <span className="truncate text-sm font-medium group-hover:underline">
                            {post.caption ??
                              `${kindLabels[post.kind]} performance`}
                          </span>
                          <span className="flex gap-2 text-xs text-muted-foreground">
                            <span>{kindLabels[post.kind]}</span>
                            {post.publishedAt && (
                              <span>
                                {published.format(new Date(post.publishedAt))}
                              </span>
                            )}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    </th>
                    {columns.map((metric, index) => (
                      <td
                        key={metric}
                        className={cn(
                          "px-3 py-3 text-right",
                          index === 0 && "font-medium"
                        )}
                      >
                        {count(post.metrics[metric])}
                      </td>
                    ))}
                    {engagement && (
                      <td className="px-3 py-3 text-right">
                        {percentage(post.metrics.engagementRate)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {engagement &&
                "Engagement = (likes + comments + saves + shares) ÷ reach."}
            </span>
            <div className="flex items-center gap-3 tabular-nums">
              <span>
                {count(report.totalPosts)}{" "}
                {report.totalPosts === 1 ? "post" : "posts"}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={report.page <= 1}
                onClick={() => onPage(report.page - 1)}
              >
                <ChevronLeft />
              </Button>
              <span>
                Page {report.page} of {Math.max(1, report.pages)}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={report.page >= report.pages}
                onClick={() => onPage(report.page + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
