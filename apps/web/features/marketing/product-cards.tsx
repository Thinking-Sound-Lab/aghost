import type { ReactNode } from "react"
import { Check, Heart, MessageCircle, Repeat2 } from "lucide-react"
import { PLATFORM_RULES, type Platform } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Monogram } from "@/components/brand"
import { PlatformIcon } from "@/components/platform-icon"

// Product moments drawn with example content, for the marketing pages. They
// are pictures: the panels around them hide them from assistive technology.

export const PLATFORM_ORDER: Platform[] = [
  "instagram",
  "facebook",
  "linkedin",
  "twitter",
  "threads",
  "youtube",
]

function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border border-ink/10 bg-white p-5 text-ink shadow-[0_18px_40px_-24px_rgb(22_37_43/0.45)]",
        className
      )}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium tracking-[0.14em] text-ink/50 uppercase">
      {children}
    </p>
  )
}

function Toggle() {
  return (
    <span className="relative h-4 w-7 shrink-0 rounded-full bg-ink">
      <span className="absolute top-0.5 right-0.5 size-3 rounded-full bg-white" />
    </span>
  )
}

/** A caption written once for every channel, with its mention in colour. */
export function ComposerCard({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
          <Monogram className="size-6" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">aghost</p>
          <p className="text-xs text-ink/50">@aghost · Shared caption</p>
        </div>
      </div>
      <p className="mt-4 text-[15px] leading-6">
        Our spring drop is live 🌿 Three looks, one weekend.{" "}
        <span className="text-[#1d9bf0]">@studio.north</span> shot the lookbook.
        Comment <b className="font-semibold">LOOK</b> and we’ll DM you the link.{" "}
        <span className="text-[#1d9bf0]">#springdrop</span>
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
        <span className="flex gap-1.5">
          {PLATFORM_ORDER.map((platform) => (
            <span
              key={platform}
              className="grid size-7 place-items-center bg-sage text-ink"
            >
              <PlatformIcon platform={platform} size={13} />
            </span>
          ))}
        </span>
        <span className="text-xs text-ink/50 tabular-nums">142 / 280</span>
      </div>
    </Panel>
  )
}

/** The same post as X's timeline and a LinkedIn feed would show it. */
export function PreviewCard({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-3", className)}>
      <Panel className="p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="grid size-8 place-items-center rounded-full bg-ink text-white">
            <Monogram className="size-5" />
          </span>
          <b className="font-semibold">aghost</b>
          <span className="text-ink/50">@aghost · now</span>
          <PlatformIcon platform="twitter" size={14} className="ml-auto" />
        </div>
        <p className="mt-2 pl-10 text-[14px] leading-5">
          Our spring drop is live 🌿 Three looks, one weekend.{" "}
          <span className="text-[#1d9bf0]">#springdrop</span>
        </p>
        <div className="mt-3 flex justify-between pl-10 text-xs text-ink/50 [&_span]:flex [&_span]:items-center [&_span]:gap-1 [&_svg]:size-3.5">
          <span>
            <MessageCircle />
            53
          </span>
          <span>
            <Repeat2 />
            78
          </span>
          <span>
            <Heart />
            1.1K
          </span>
        </div>
      </Panel>
      <Panel className="ml-8 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
            <Monogram className="size-6" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">aghost</p>
            <p className="text-[11px] text-ink/50">Just now · 🌐</p>
          </div>
          <PlatformIcon
            platform="linkedin"
            size={14}
            className="ml-auto text-[#0a66c2]"
          />
        </div>
        <p className="mt-2.5 text-[13px] leading-5">
          Our spring collection is live, and we wanted to share how the lookbook
          came together with Studio North…{" "}
          <span className="text-ink/50">more</span>
        </p>
      </Panel>
    </div>
  )
}

/** The calendar day it goes out, and the channels switched on for it. */
export function ScheduleCard({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <div className="flex items-center gap-4">
        <span className="grid w-12 overflow-hidden border border-ink/10 text-center">
          <span className="bg-sage py-0.5 text-[9px] font-semibold tracking-wider text-ink/60 uppercase">
            Oct
          </span>
          <span className="py-1 text-lg leading-none font-semibold tabular-nums">
            24
          </span>
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Friday, 10:00 AM</p>
          <p className="text-xs text-ink/50">in 2 days</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2.5 border-t border-ink/10 pt-4">
        {PLATFORM_ORDER.slice(0, 5).map((platform) => (
          <li key={platform} className="flex items-center gap-3 text-sm">
            <Toggle />
            <PlatformIcon platform={platform} size={14} />
            <span>{PLATFORM_RULES[platform].name}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** Someone comments the keyword, and the link arrives in their DMs. */
export function ReplyCard({ className }: { className?: string }) {
  return (
    <Panel className={cn("grid gap-3", className)}>
      <Label>Instagram · comment to DM</Label>
      <div className="flex items-start gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f2c6b4] text-[11px] font-semibold">
          M
        </span>
        <p className="text-sm">
          <b className="font-semibold">maya.lee</b> LOOK 🙌
        </p>
      </div>
      <div className="ml-9 grid w-fit max-w-[16rem] gap-2 rounded-2xl rounded-tl-sm bg-sage px-3.5 py-3 text-sm">
        Hi Maya! Here’s the spring lookbook ✨
        <span className="rounded-lg bg-white py-1.5 text-center text-[13px] font-medium">
          Open the lookbook
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink/55">
        <Check className="size-3.5" />
        Sent in 2 seconds · public reply posted
      </p>
    </Panel>
  )
}

const results = [
  {
    platform: "instagram" as const,
    metric: "Reach",
    value: "12.4K",
    share: 92,
  },
  { platform: "youtube" as const, metric: "Views", value: "8.1K", share: 68 },
  {
    platform: "linkedin" as const,
    metric: "Impressions",
    value: "3.2K",
    share: 34,
  },
  {
    platform: "twitter" as const,
    metric: "Impressions",
    value: "2.7K",
    share: 28,
  },
]

/** What each channel did with the post, side by side. */
export function ResultsCard({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <div className="flex items-baseline justify-between">
        <Label>Spring drop · last 7 days</Label>
        <span className="text-xs text-ink/50">412 link clicks</span>
      </div>
      <ul className="mt-4 grid gap-3.5">
        {results.map((row) => (
          <li key={row.platform} className="grid gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <PlatformIcon platform={row.platform} size={13} />
              {PLATFORM_RULES[row.platform].name}
              <span className="ml-auto text-ink/50">{row.metric}</span>
              <b className="w-12 text-right font-semibold tabular-nums">
                {row.value}
              </b>
            </div>
            <span className="h-1.5 bg-sage">
              <span
                className="block h-full bg-ink"
                style={{ width: `${row.share}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** Accounts on each platform, connected through its own login. */
export function ChannelsCard({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <Label>Social set · 6 channels</Label>
      <ul className="mt-4 grid gap-3">
        {PLATFORM_ORDER.map((platform) => (
          <li key={platform} className="flex items-center gap-3 text-sm">
            <span className="grid size-8 place-items-center bg-sage">
              <PlatformIcon platform={platform} size={15} />
            </span>
            <span className="min-w-0 flex-1">
              {PLATFORM_RULES[platform].name}
            </span>
            <span className="flex items-center gap-1 text-xs text-ink/55">
              <Check className="size-3.5" />
              Connected
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
