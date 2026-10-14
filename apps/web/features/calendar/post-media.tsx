import Image from "next/image"
import type { PostMedia } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"

const time = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

/** "Oct 20, 9:00 AM" in the viewer's time zone. */
export function timeLabel(iso: string): string {
  return time.format(new Date(iso))
}

/** A photo or a video's first frame, filling a positioned parent. */
export function MediaThumb({
  media,
  className,
}: {
  media: PostMedia
  className?: string
}) {
  if (media.type === "video")
    return (
      <video
        // The fragment makes Safari show the first frame instead of nothing.
        src={`${media.url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className={cn("absolute inset-0 size-full object-cover", className)}
      />
    )
  return (
    <Image
      src={media.url}
      alt=""
      fill
      unoptimized
      className={cn("object-cover", className)}
    />
  )
}

/** A scheduled post as the phone preview shows it. */
export function previewOf(post: {
  media: PostMedia[]
  caption: string | null
}) {
  const cover = post.media[0]
  return {
    thumbnailUrl: cover?.type === "image" ? cover.url : null,
    videoUrl: cover?.type === "video" ? cover.url : null,
    caption: post.caption,
    likeCount: null,
  }
}
