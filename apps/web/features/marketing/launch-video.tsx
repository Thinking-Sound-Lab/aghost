import { cn } from "@workspace/ui/lib/utils"

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
