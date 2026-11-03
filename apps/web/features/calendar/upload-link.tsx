"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Loader2, X } from "lucide-react"
import {
  MEDIA_CONTENT_TYPES,
  POST_LIMITS,
  uploadLinkLoginPath,
} from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import { Brand } from "@/components/brand"
import { ErrorBanner, Loading } from "@/components/interface"
import { PlayableMedia } from "@/features/calendar/post-media"
import { useAuthStore } from "@/stores/auth-store"
import { useUploadLinkStore } from "@/stores/upload-link-store"

const ACCEPT = Object.keys(MEDIA_CONTENT_TYPES).join(",")

function Heading({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

/** Where an agent that cannot upload files itself sends the owner to upload them. */
export function UploadLinkPage({ linkId }: { linkId: string | null }) {
  const auth = useAuthStore()
  const upload = useUploadLinkStore()
  const router = useRouter()
  useEffect(() => {
    if (linkId && auth.status === "idle") void auth.load()
  }, [linkId, auth.status, auth.load])
  useEffect(() => {
    if (!linkId) return
    if (auth.status === "signed_out")
      router.replace(uploadLinkLoginPath(linkId))
    if (auth.status === "signed_in") void upload.load(linkId)
    return upload.reset
  }, [linkId, auth.status, upload.load, upload.reset, router])

  const link = upload.link
  const room =
    POST_LIMITS.maxMediaItems - upload.media.length - upload.uploads.length
  let content: React.ReactNode = <Loading />
  if (!linkId || upload.missing)
    content = (
      <Heading title="This link is not valid">
        Ask your agent for a new one.
        {auth.user && ` You are signed in as ${auth.user.email}.`}
      </Heading>
    )
  else if (auth.status === "error")
    content = (
      <ErrorBanner message={auth.error} retry={() => void auth.load()} />
    )
  else if (upload.status === "error")
    content = (
      <ErrorBanner
        message={upload.error}
        retry={() => void upload.load(linkId)}
      />
    )
  else if (upload.status === "ready" && link?.status === "expired")
    content = (
      <Heading title="This link has expired">
        Ask your agent for a new one.
      </Heading>
    )
  else if (upload.status === "ready" && link)
    content = (
      <>
        {link.status === "uploaded" ? (
          <Heading title="Sent to your agent">
            Go back to your chat and tell your agent the files are ready.
          </Heading>
        ) : (
          <Heading title="Upload for your agent">
            Choose the photos and videos for your post, in order. The first is
            the cover.
          </Heading>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          {upload.media.map((item, index) => (
            <div
              key={item.url}
              className="relative aspect-square overflow-hidden rounded-md bg-muted"
            >
              <PlayableMedia media={item} />
              {link.status === "waiting" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  aria-label={`Remove item ${index + 1}`}
                  disabled={upload.sending}
                  onClick={() => upload.removeMedia(index)}
                  className="absolute top-1 right-1"
                >
                  <X />
                </Button>
              )}
            </div>
          ))}
          {upload.uploads.map((item) => (
            <div
              key={item.key}
              className="grid aspect-square place-items-center content-center gap-1 rounded-md bg-muted p-2 text-center"
            >
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="w-full truncate text-[10px] text-muted-foreground">
                {item.name}
              </span>
            </div>
          ))}
          {link.status === "waiting" && room > 0 && (
            <label className="grid aspect-square cursor-pointer place-items-center content-center gap-1 rounded-md bg-muted text-xs text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring hover:text-foreground">
              <ImagePlus className="size-5" />
              Add
              <input
                type="file"
                disabled={upload.sending || upload.uploads.length > 0}
                accept={ACCEPT}
                multiple
                className="sr-only"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])]
                  event.target.value = ""
                  void upload.addFiles(files)
                }}
              />
            </label>
          )}
        </div>
        {link.status === "waiting" && (
          <>
            <ErrorBanner message={upload.error} />
            <Button
              className="justify-self-end"
              disabled={
                upload.sending ||
                upload.uploads.length > 0 ||
                upload.media.length === 0
              }
              onClick={() => void upload.send()}
            >
              {upload.sending && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              Send to agent
            </Button>
          </>
        )}
      </>
    )

  return (
    <main className="grid min-h-dvh place-items-center bg-muted p-4">
      <section className="grid w-full max-w-md gap-6 bg-card p-6 sm:p-8">
        <Brand href="/home" />
        {content}
      </section>
    </main>
  )
}
