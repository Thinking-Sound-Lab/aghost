import Link from "next/link"
import { CalendarDays, Film, Images, Image, Zap } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { schedulingFeature } from "./content"
import { primaryButton, textLink } from "./shell"

const posts = [
  {
    day: 15,
    time: "6:00 PM",
    title: "Free guide reel",
    Icon: Film,
    keyword: "GUIDE",
  },
  {
    day: 20,
    time: "12:00 PM",
    title: "New collection",
    Icon: Images,
    keyword: "SHOP",
  },
  {
    day: 23,
    time: "9:00 AM",
    title: "Behind the scenes",
    Icon: Image,
    keyword: null,
  },
]

/** An example of the calendar's month view and mobile agenda, with no live data. */
export function CalendarPreview({ compact = false }: { compact?: boolean }) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-2xl bg-[#101010] text-white shadow-2xl ring-1 shadow-black/20 ring-white/15">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <span className="flex items-center gap-2.5 font-semibold">
          <CalendarDays aria-hidden="true" className="size-4 text-brand" />
          Calendar
        </span>
        <span className="text-xs text-white/55">Example content · October</span>
      </figcaption>
      <div className="hidden sm:block" aria-label="October example calendar">
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/5 text-center text-[10px] text-white/55">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day} className="py-2">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-white/10">
          {Array.from({ length: 35 }, (_, index) => {
            const day = index - 3
            const post = posts.find((item) => item.day === day)
            return (
              <div
                key={index}
                className={cn(
                  "min-w-0 bg-[#101010] p-1.5",
                  compact ? "min-h-12" : "min-h-16",
                  post?.day === 15 && "bg-[#15241b]"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] text-white/55 tabular-nums",
                    day < 1 && "text-white/25"
                  )}
                >
                  {day < 1 ? day + 30 : day}
                </span>
                {post && (
                  <div className="mt-1 min-w-0 text-[10px]">
                    <span className="flex items-center gap-1 whitespace-nowrap text-white/85">
                      <span className="size-1 shrink-0 rounded-full bg-brand" />
                      {post.time.replace(":00", "")}
                      {post.keyword && (
                        <Zap
                          aria-label="Has a DM automation"
                          className="size-2.5 shrink-0 text-brand"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-white/55">
                      {post.title}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <ul
        className="grid gap-4 p-5 sm:hidden"
        aria-label="Example scheduled posts"
      >
        {posts.map(({ day, time, title, Icon, keyword }) => (
          <li key={day} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{title}</span>
              <span className="text-xs text-white/55">
                October {day} · {time}
              </span>
            </span>
            {keyword && (
              <Zap
                aria-label="Has a DM automation"
                className="size-3.5 shrink-0 text-brand"
              />
            )}
          </li>
        ))}
      </ul>
      <div className="grid gap-3 border-t border-white/10 bg-white/[0.03] p-5">
        <p className="flex items-center gap-2 text-xs font-medium text-brand">
          <Zap aria-hidden="true" className="size-3.5" />
          DM automation attached to “Free guide reel”
        </p>
        <p className="text-sm leading-relaxed text-white/75">
          Comment{" "}
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold text-white">
            GUIDE
          </span>{" "}
          and get the free guide by DM.
        </p>
        <p className="text-xs text-white/45">
          Ready to answer comments once the reel is published.
        </p>
      </div>
    </figure>
  )
}

export function Scheduling({ className }: { className?: string }) {
  return (
    <section
      id="scheduling"
      aria-labelledby="scheduling-heading"
      className={cn(
        "mx-auto mt-24 max-w-7xl scroll-mt-24 px-5 sm:px-8",
        className
      )}
    >
      <div className="grid items-center gap-10 rounded-[2rem] bg-[#161616] p-6 ring-1 ring-white/10 sm:p-10 lg:grid-cols-[2fr_3fr] lg:gap-12">
        <div className="grid content-start gap-6">
          <h2
            id="scheduling-heading"
            className="max-w-lg text-4xl leading-[1.1] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl"
          >
            {schedulingFeature.title}
          </h2>
          <p className="max-w-xl text-lg text-white/70">
            {schedulingFeature.text}
          </p>
          <ul className="grid gap-4 text-sm text-white/75">
            <li className="flex items-start gap-3">
              <CalendarDays
                aria-hidden="true"
                className="size-5 shrink-0 text-brand-cyan"
              />
              See your upcoming content in one calendar.
            </li>
            <li className="flex items-start gap-3">
              <Zap aria-hidden="true" className="size-5 shrink-0 text-brand" />
              Prepare the keyword, DM and link before your post goes live.
            </li>
          </ul>
          <Link href="/login" className={cn(primaryButton, "mt-1 w-fit")}>
            Start scheduling
          </Link>
          <Link
            href="/blog/how-to-schedule-instagram-posts"
            className={cn(textLink, "w-fit")}
          >
            How to schedule Instagram posts, Reels, and Stories
          </Link>
        </div>
        <div className="min-w-0 rounded-[1.5rem] bg-linear-to-br from-brand-blue to-[#08245f] p-3 sm:p-5">
          <CalendarPreview />
        </div>
      </div>
    </section>
  )
}
