import { CalendarDays, Film, Images, Image, Zap } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

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
export function CalendarPreview() {
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
                  "min-h-16 min-w-0 bg-[#101010] p-1.5",
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
