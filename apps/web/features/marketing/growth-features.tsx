import type { ReactNode } from "react"
import Link from "next/link"
import { Clock3, Heart, MousePointer2 } from "lucide-react"
import { AUTOMATION_LIMITS } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Mascot } from "@/components/brand"
import { ClaudeCodeApp } from "./agent-apps"
import { ProductCarouselScene } from "./illustrations"
import { CalendarPreview } from "./scheduling"

/** Light message previews for the compact feature tiles. */
function Message({
  children,
  buttons = [],
}: {
  children: ReactNode
  buttons?: string[]
}) {
  return (
    <div className="flex items-end gap-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black/10">
        <Mascot size={23} />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white text-[12px] leading-snug text-black shadow-sm ring-1 ring-black/5">
        <p className="px-3 py-2.5">{children}</p>
        {buttons.map((button) => (
          <p
            key={button}
            className="border-t border-black/10 px-3 py-2 text-center font-semibold"
          >
            {button}
          </p>
        ))}
      </div>
    </div>
  )
}

function CommentPreview() {
  return (
    <div className="grid gap-4 text-[12px] text-black">
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-orange/50 font-bold">
          S
        </span>
        <p className="flex-1">
          <b>sarah</b> GUIDE 🙌
        </p>
        <Heart className="size-3.5" />
      </div>
      <div className="ml-6 flex items-center gap-2.5">
        <Mascot size={27} />
        <p className="flex-1">
          <b>aghost</b> Sent you a DM ✨
        </p>
        <Heart className="size-3.5" />
      </div>
    </div>
  )
}

function AnalyticsPreview() {
  return (
    <div className="rounded-2xl bg-white p-4 text-black shadow-sm ring-1 ring-black/5">
      <p className="text-[10px] font-medium text-black/50">Example campaign</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-black/60">Link clicks</p>
          <p className="text-3xl font-bold tracking-tight">214</p>
        </div>
        <MousePointer2 className="mt-2 size-5 text-brand-blue" />
      </div>
      <div className="mt-3 flex h-12 items-end gap-1.5">
        {[35, 55, 42, 72, 58, 90, 75, 100].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t bg-brand-blue/75"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function InboxPreview() {
  return (
    <div className="grid gap-3 rounded-2xl bg-white p-4 text-black shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-red/25 text-xs font-bold">
          S
        </span>
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-semibold">sarah</p>
          <p className="mt-0.5 text-black/55">link please 🙏</p>
        </div>
        <span className="size-2 rounded-full bg-brand-blue" />
      </div>
      <p className="ml-auto rounded-xl bg-brand-blue px-3 py-2 text-xs text-white">
        Here you go! ✨
      </p>
    </div>
  )
}

const tiles: {
  label: string
  title: string
  text: string
  color: string
  picture: ReactNode
}[] = [
  {
    label: "Comment automation",
    title: "Turn comments into DMs",
    text: "Deliver your link from a keyword comment on a post or Reel, with an optional public reply.",
    color: "bg-[#fff6ad]",
    picture: <CommentPreview />,
  },
  {
    label: "Personal messages",
    title: "Their name. Your best links.",
    text: `Make the DM personal and add up to ${AUTOMATION_LIMITS.maxDmButtons} buttons for your guide, shop, or booking page.`,
    color: "bg-[#dce7ff]",
    picture: (
      <Message buttons={["Free guide", "Book a call", "Shop the look"]}>
        Here are your links, Sarah ✨
      </Message>
    ),
  },
  {
    label: "Follower growth",
    title: "Followers-only links",
    text: "Ask people to follow before unlocking the resource. Confirmed followers get the link straight away.",
    color: "bg-[#d9f4e5]",
    picture: (
      <Message buttons={["I’m following"]}>
        Follow @aghost to unlock the guide 🔒
      </Message>
    ),
  },
  {
    label: "Opening messages",
    title: "One tap. Then the link.",
    text: "Open with a short message and a button. Send the resource after they tap.",
    color: "bg-[#eadfff]",
    picture: (
      <Message buttons={["Send me the guide"]}>
        Thanks for the comment! Want the guide?
      </Message>
    ),
  },
  {
    label: "Product cards",
    title: "Products, one swipe away",
    text: "Send up to 10 product cards with images and tracked links. Included on Growth and Business.",
    color: "bg-[#ffe3c7]",
    picture: <ProductCarouselScene />,
  },
  {
    label: "Follow-up nudges",
    title: "A well-timed reminder",
    text: "Send one follow-up within the messaging window. Stops after a reply or link click. Included on Business.",
    color: "bg-[#ffe0e7]",
    picture: (
      <div className="grid gap-3">
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-black/55">
          <Clock3 className="size-3" /> 1 hour later
        </p>
        <Message buttons={["Get the guide"]}>
          Here’s the guide in case you missed it 👇
        </Message>
      </div>
    ),
  },
  {
    label: "Analytics",
    title: "See what gets the click",
    text: "Track comments, DMs sent, and link clicks for each automation, plus individual delivery activity.",
    color: "bg-[#d7f1f5]",
    picture: <AnalyticsPreview />,
  },
  {
    label: "Inbox",
    title: "Keep the conversation going",
    text: "Read and answer Instagram conversations, and pick up where the automation leaves off.",
    color: "bg-[#eee7ff]",
    picture: <InboxPreview />,
  },
]

/** Two primary workflows, then the smaller capabilities that support them. */
export function GrowthFeatureBoard() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-8">
      <ul className="grid gap-4 lg:grid-cols-12">
        <li
          id="scheduling"
          className="flex min-w-0 scroll-mt-24 flex-col gap-7 overflow-hidden rounded-[2rem] bg-brand-blue p-6 text-white sm:p-8 lg:col-span-7"
        >
          <div className="grid content-start gap-4">
            <span className="w-fit rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold">
              Scheduling
            </span>
            <h3 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
              Schedule your Instagram content
            </h3>
            <p className="max-w-xl text-lg text-white/85">
              Plan posts, Reels, carousels, and Stories in one calendar. Prepare
              a post’s comment-to-DM automation before it goes live.
            </p>
          </div>
          <CalendarPreview compact />
        </li>
        <li className="flex min-w-0 flex-col justify-between gap-8 overflow-hidden rounded-[2rem] bg-brand-cyan p-6 text-black sm:p-8 lg:col-span-5">
          <ClaudeCodeApp />
          <div className="grid content-start gap-4">
            <span className="w-fit rounded-full bg-black/10 px-3.5 py-1.5 text-xs font-semibold">
              AI agents
            </span>
            <h3 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
              Work with your AI agent
            </h3>
            <p className="text-lg text-black/75">
              Ask Claude Code, Codex, or Cursor to schedule content, prepare
              automations, and check results. Review everything in aghost.
            </p>
            <Link
              href="/agents"
              className="w-fit font-semibold underline decoration-black/35 underline-offset-4 hover:decoration-black focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Connect your agent
            </Link>
          </div>
        </li>
      </ul>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <li
            key={tile.label}
            className="flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] bg-white text-black ring-1 ring-white/15"
          >
            <div
              aria-hidden="true"
              className={cn(
                "flex h-52 shrink-0 items-center justify-center overflow-hidden px-5 py-4",
                tile.color
              )}
            >
              <div className="w-full max-w-xs">{tile.picture}</div>
            </div>
            <div className="grid flex-1 content-start gap-2 border-t border-black/10 p-5">
              <p className="text-xs font-medium text-black/50">{tile.label}</p>
              <h3 className="text-xl leading-snug font-bold tracking-[-0.025em]">
                {tile.title}
              </h3>
              <p className="text-sm leading-relaxed text-black/65">
                {tile.text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
