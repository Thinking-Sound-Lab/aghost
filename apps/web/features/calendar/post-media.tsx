"use client"

import { useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import { isYouTubeShort, type PostMedia } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { useVideoStore } from "@/stores/video-store"

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

/** A photo, or a video that plays when clicked, filling a positioned parent. */
export function PlayableMedia({
  media,
  className,
}: {
  media: PostMedia
  className?: string
}) {
  if (media.type === "image")
    return <MediaThumb media={media} className={className} />
  // A new video starts paused.
  return <VideoPlayer key={media.url} url={media.url} className={className} />
}

function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const id = useId()
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const loaded = useVideoStore((state) => state.loaded)
  const started = useVideoStore((state) => state.started)
  const current = useVideoStore((state) => state.playing)
  // Another video started.
  useEffect(() => {
    if (current !== id) video.current!.pause()
  }, [current, id])
  // Hidden, as a closed preview is, or scrolled out of view.
  useEffect(() => {
    const element = video.current!
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry!.isIntersecting) element.pause()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <>
      <video
        ref={video}
        src={`${url}#t=0.1`}
        playsInline
        loop
        preload="metadata"
        onLoadedMetadata={(event) => {
          const { videoWidth, videoHeight, duration } = event.currentTarget
          loaded(url, {
            width: videoWidth,
            height: videoHeight,
            seconds: duration,
          })
        }}
        onPlay={() => {
          setPlaying(true)
          started(id)
        }}
        onPause={() => setPlaying(false)}
        className={cn("absolute inset-0 size-full object-cover", className)}
      />
      <button
        type="button"
        aria-label={playing ? "Pause video" : "Play video"}
        onClick={() => {
          const element = video.current!
          if (element.paused) void element.play()
          else element.pause()
        }}
        className="absolute inset-0 grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {!playing && (
          <span className="grid size-11 place-items-center rounded-full bg-black/50 text-white">
            <Play className="size-5 fill-current" />
          </span>
        )}
      </button>
    </>
  )
}

/** Whether YouTube publishes the media as a Short, known once its video loads. */
export function useYouTubeShort(media: PostMedia[]): boolean {
  const video =
    media.length === 1 && media[0]?.type === "video" ? media[0] : null
  const shape = useVideoStore((state) =>
    video ? state.shapes[video.url] : undefined
  )
  return shape !== undefined && isYouTubeShort(shape)
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
