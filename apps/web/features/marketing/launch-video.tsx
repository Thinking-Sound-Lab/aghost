import { cn } from "@workspace/ui/lib/utils"
import { SectionHeading } from "./shell"

/** The launch video. Nothing downloads until someone presses play. */
export function LaunchVideoPlayer({ className }: { className?: string }) {
  return (
    <video
      controls
      playsInline
      preload="none"
      poster="/aghost-launch-poster.jpg"
      aria-label="aghost launch video"
      className={cn("aspect-video w-full bg-black", className)}
    >
      <source src="/aghost-launch.mp4" type="video/mp4" />
    </video>
  )
}

/** The launch video, framed like the product panels. */
export function LaunchVideo() {
  return (
    <section
      id="video"
      aria-labelledby="video-heading"
      className="mx-auto mt-32 max-w-7xl scroll-mt-24 px-5 sm:px-8"
    >
      <SectionHeading
        id="video-heading"
        title="See aghost in action"
        description="One prompt to Claude Code, and everyone who comments GUIDE gets the guide in their DMs."
      />
      <div className="mt-12 rounded-[2rem] bg-linear-to-br from-[#0a2a8a] via-brand-blue to-brand-cyan p-2 shadow-[0_0_120px_-30px_var(--color-brand-blue)] sm:p-3">
        <LaunchVideoPlayer className="rounded-[1.6rem]" />
      </div>
    </section>
  )
}
