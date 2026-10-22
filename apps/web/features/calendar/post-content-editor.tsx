"use client"

import { useId, useRef, type ReactNode } from "react"
import {
  ArrowUpLeft,
  Globe2,
  ImagePlus,
  Link2,
  Loader2,
  Unlink2,
  X,
} from "lucide-react"
import {
  CAPTION_MAX_LENGTH,
  MEDIA_CONTENT_TYPES,
  PLATFORM_RULES,
  POST_LIMITS,
  accountLabel,
  type Account,
  type Platform,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Avatar } from "@/components/interface"
import { captionFor, useComposerStore } from "@/stores/composer-store"
import { MediaThumb } from "./post-media"
import { RichText } from "./post-preview"

const PLACEHOLDER: Record<Platform, string> = {
  instagram: "Write a caption…",
  facebook: "What’s on your mind?",
  linkedin: "What do you want to talk about?",
  twitter: "What’s happening?",
  threads: "What’s new?",
  youtube: "Tell viewers about your video",
}

/** Fields that the editor shows beside their input rather than in a list. */
export const INLINE_FIELDS = ["caption", "media", "youtube.title"]

/** One account's post, written in the layout its app shows it in. */
export function PostContentEditor({
  account,
  chosen,
  editable,
  busy,
}: {
  account: Account
  chosen: Account[]
  editable: boolean
  busy: boolean
}) {
  const composer = useComposerStore()
  const { draft, fields, post, uploads } = composer
  const { platform } = account
  const rules = PLATFORM_RULES[platform]
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const story = draft.kind === "story"
  const own = account.id in draft.captions
  const shared = chosen.length > 1 && !post
  const caption = captionFor(draft, account.id)
  const prefix = post
    ? ""
    : `targets.${chosen.findIndex((item) => item.id === account.id)}.`
  const captionError = fields[`${prefix}caption`] ?? fields.caption
  const mediaError = fields[`${prefix}media`] ?? fields.media
  const titleError = fields[`${prefix}youtube.title`]
  const youtube = draft.youtube[account.id]
  const name = account.displayName || account.username
  const locked = !editable || busy
  const room =
    (story || draft.trialReel ? 1 : POST_LIMITS.maxMediaItems) -
    draft.media.length -
    uploads.length
  const canUpload = editable && !busy && uploads.length === 0 && room > 0
  const accept = draft.trialReel
    ? "video/mp4,video/quicktime"
    : Object.keys(MEDIA_CONTENT_TYPES).join(",")

  const text = story ? null : (
    <CaptionInput
      platform={platform}
      label={`${platform === "youtube" ? "Description" : "Caption"} for ${accountLabel(account)}`}
      placeholder={PLACEHOLDER[platform]}
      value={caption}
      invalid={!!captionError || caption.trim().length > rules.captionMaxLength}
      disabled={locked}
      maxLength={post ? rules.captionMaxLength : CAPTION_MAX_LENGTH}
      onChange={(value) => {
        if (own) composer.setCaption(account.id, value)
        else composer.patch({ caption: value })
      }}
      className={cn(
        "min-h-16",
        platform === "linkedin" ? "text-sm leading-5" : "text-[15px] leading-5",
        platform === "youtube" && "min-h-12 text-[13px] leading-[18px]"
      )}
    />
  )
  const media = (
    <MediaEditor
      shape={
        story
          ? "story"
          : platform === "instagram"
            ? "portrait"
            : platform === "youtube"
              ? "video"
              : "flexible"
      }
      inputId={inputId}
      canUpload={canUpload}
      editable={editable}
      busy={busy}
      error={mediaError}
      rounded={platform === "twitter" || platform === "threads"}
    />
  )
  const tools = editable && (
    <div className="grid gap-1.5">
      <div className="flex min-h-9 items-center gap-1 border-t pt-2 text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Add photos or video"
          title={
            shared
              ? "Add photos or video. Every channel gets the same media."
              : "Add photos or video"
          }
          disabled={!canUpload}
          onClick={() => input.current?.click()}
        >
          <ImagePlus />
        </Button>
        {shared && !story && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={locked}
            aria-pressed={own}
            title={
              own
                ? `Only ${rules.name} uses this text. Click to use the shared text again.`
                : `Every channel uses this text. Click to write a version just for ${rules.name}.`
            }
            onClick={() => composer.customize(account.id, !own)}
            className={cn("text-xs font-normal", own && "text-foreground")}
          >
            {own ? <Unlink2 /> : <Link2 />}
            {own ? `Only on ${rules.name}` : "Synced"}
          </Button>
        )}
        {!story && (
          <CharacterCount
            length={caption.trim().length}
            limit={rules.captionMaxLength}
          />
        )}
      </div>
      {captionError && (
        <p role="alert" className="text-xs text-destructive">
          {captionError}
        </p>
      )}
    </div>
  )
  const picker = editable && (
    <input
      ref={input}
      id={inputId}
      aria-label="Upload photos or video"
      type="file"
      disabled={!canUpload}
      accept={accept}
      multiple={!story && !draft.trialReel}
      className="sr-only"
      onChange={(event) => {
        const files = [...(event.target.files ?? [])]
        event.target.value = ""
        void composer.addFiles(files)
      }}
    />
  )

  let body: ReactNode
  if (story)
    body = (
      <>
        <Identity account={account} detail="Your story" />
        {media}
      </>
    )
  else if (platform === "twitter" || platform === "threads")
    body = (
      <div className="flex gap-3">
        <Avatar
          src={account.profilePictureUrl}
          name={name}
          className="size-10"
        />
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="grid gap-1">
            <p className="flex min-w-0 items-baseline gap-1.5 text-[15px] leading-5">
              <span className="truncate font-bold">
                {platform === "twitter" ? name : account.username}
              </span>
              {platform === "twitter" && (
                <span className="truncate text-muted-foreground">
                  @{account.username}
                </span>
              )}
            </p>
            {text}
          </div>
          {media}
          {tools}
        </div>
      </div>
    )
  else if (platform === "instagram")
    body = (
      <>
        <Identity account={account} detail={null} />
        {media}
        {text}
        {tools}
      </>
    )
  else if (platform === "youtube")
    body = (
      <>
        {media}
        <label className="grid gap-1">
          <span className="sr-only">
            Video title for {accountLabel(account)}
          </span>
          <input
            placeholder="Give your video a title"
            disabled={locked}
            aria-invalid={!!titleError}
            maxLength={rules.titleMaxLength ?? undefined}
            value={youtube?.title ?? ""}
            onChange={(event) =>
              composer.setYouTube(account.id, { title: event.target.value })
            }
            className="w-full bg-transparent text-lg leading-snug font-semibold outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          {titleError && (
            <span role="alert" className="text-xs text-destructive">
              {titleError}
            </span>
          )}
        </label>
        <Identity account={account} detail={null} />
        <div className="rounded-xl bg-muted px-3 py-2.5">{text}</div>
        {tools}
      </>
    )
  else
    body = (
      <>
        <Identity
          account={account}
          detail={
            <>
              {platform === "linkedin" ? "Post to anyone" : "Public"}
              <Globe2 className="size-3" />
            </>
          }
        />
        {text}
        {media}
        {tools}
      </>
    )

  return (
    <div
      className={cn("grid min-w-0 gap-4", platform === "instagram" && "gap-3")}
      onDragOver={(event) => {
        if (canUpload) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        if (canUpload) void composer.addFiles([...event.dataTransfer.files])
      }}
    >
      {body}
      {picker}
    </div>
  )
}

function Identity({
  account,
  detail,
}: {
  account: Account
  detail: ReactNode
}) {
  const { platform } = account
  const handle = platform === "instagram" || platform === "threads"
  const name = handle
    ? account.username
    : account.displayName || account.username
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {platform === "instagram" ? (
        <span className="rounded-full bg-linear-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px]">
          <Avatar
            src={account.profilePictureUrl}
            name={name}
            className="size-8 ring-2 ring-card"
          />
        </span>
      ) : (
        <Avatar
          src={account.profilePictureUrl}
          name={name}
          className={platform === "linkedin" ? "size-12" : "size-10"}
        />
      )}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[15px] font-semibold">{name}</p>
        {detail && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * A textarea that grows with its text. The text is drawn by a copy behind it,
 * so links, mentions and hashtags take the platform's colour as you type.
 */
function CaptionInput({
  platform,
  label,
  placeholder,
  value,
  invalid,
  disabled,
  maxLength,
  onChange,
  className,
}: {
  platform: Platform
  label: string
  placeholder: string
  value: string
  invalid: boolean
  disabled: boolean
  maxLength: number
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid [overflow-wrap:break-word] whitespace-pre-wrap",
        className
      )}
    >
      <div aria-hidden="true" className="col-start-1 row-start-1">
        <RichText text={value} platform={platform} />
        {/* Gives a trailing line break its height. */}
        {"​"}
      </div>
      <textarea
        aria-label={label}
        aria-invalid={invalid}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="col-start-1 row-start-1 resize-none overflow-hidden bg-transparent text-transparent caret-foreground outline-none selection:bg-sky-500/25 placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  )
}

/** A ring that fills toward the platform's limit, counting down near it. */
function CharacterCount({ length, limit }: { length: number; limit: number }) {
  const left = limit - length
  const near = left <= Math.max(20, Math.round(limit * 0.1))
  const circumference = 2 * Math.PI * 8
  return (
    <span
      title={`${length.toLocaleString()} / ${limit.toLocaleString()} characters`}
      className="ml-auto flex items-center gap-1.5 text-xs tabular-nums"
    >
      <span
        className={cn(
          left < 0 ? "text-destructive" : "text-muted-foreground",
          !near && "sr-only"
        )}
      >
        {near
          ? left.toLocaleString()
          : `${length.toLocaleString()} of ${limit.toLocaleString()} characters`}
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 -rotate-90">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          strokeWidth="2"
          className="stroke-border"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(length / limit, 1))}
          className={cn(
            "transition-[stroke-dashoffset]",
            left < 0
              ? "stroke-destructive"
              : near
                ? "stroke-amber-500"
                : "stroke-foreground/70"
          )}
        />
      </svg>
    </span>
  )
}

/** The post's photos and videos, which every channel shares. */
function MediaEditor({
  shape,
  inputId,
  canUpload,
  editable,
  busy,
  error,
  rounded,
}: {
  /** Where media is required, an empty post shows a drop area this shape. */
  shape: "story" | "portrait" | "video" | "flexible"
  inputId: string
  canUpload: boolean
  editable: boolean
  busy: boolean
  error: string | undefined
  rounded: boolean
}) {
  const composer = useComposerStore()
  const { draft, uploads } = composer
  const count = draft.media.length + uploads.length
  const single = count === 1 && uploads.length === 0
  const radius = rounded ? "rounded-2xl" : "rounded-md"
  const frame = {
    story: "aspect-[9/16] w-full max-w-64",
    portrait: "aspect-[4/5]",
    video: "aspect-video",
    flexible: "aspect-video",
  }[shape]
  const tile = shape === "portrait" ? "aspect-square" : "aspect-[4/3]"
  const hint =
    shape === "story"
      ? "One photo or video, shown for 24 hours."
      : draft.trialReel
        ? "One video, shown to non-followers first."
        : shape === "video"
          ? "One video."
          : null
  const alert = error && (
    <p role="alert" className="text-xs text-destructive">
      {error}
    </p>
  )
  if (count === 0) {
    if (!editable || shape === "flexible") return alert || null
    return (
      <div className="grid gap-2">
        <label
          htmlFor={inputId}
          className={cn(
            "grid cursor-pointer place-content-center gap-2 border border-dashed bg-muted/40 px-4 text-center transition-colors hover:bg-muted",
            radius,
            frame,
            !canUpload && "pointer-events-none opacity-50"
          )}
        >
          <ImagePlus className="mx-auto size-6 text-muted-foreground" />
          <span className="text-sm font-medium">
            {shape === "video" || draft.trialReel
              ? "Add a video"
              : "Add photos or a video"}
          </span>
          <span className="text-xs text-muted-foreground">
            {hint ?? "Drag files here or click to upload"}
          </span>
        </label>
        {alert}
      </div>
    )
  }
  return (
    <div className="grid gap-2">
      <div
        className={cn(
          "grid gap-1 overflow-hidden",
          radius,
          single ? "grid-cols-1" : "grid-cols-2",
          single && shape === "story" && "max-w-64"
        )}
      >
        {draft.media.map((item, index) => (
          <div
            key={item.url}
            className={cn("group relative bg-muted", single ? frame : tile)}
          >
            <MediaThumb media={item} />
            {editable && (
              <span className="absolute inset-x-2 top-2 flex justify-between opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {index > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    disabled={busy}
                    aria-label={`Move item ${index + 1} earlier`}
                    onClick={() => composer.moveEarlier(index)}
                  >
                    <ArrowUpLeft />
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  disabled={busy}
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() => composer.removeMedia(index)}
                >
                  <X />
                </Button>
              </span>
            )}
          </div>
        ))}
        {uploads.map((upload) => (
          <div
            key={upload.key}
            className={cn(
              "grid place-content-center gap-2 bg-muted p-3 text-center text-muted-foreground",
              count === 1 ? frame : tile
            )}
          >
            <Loader2 className="mx-auto size-5 animate-spin" />
            <span className="truncate text-xs">{upload.name}</span>
          </div>
        ))}
      </div>
      {alert}
    </div>
  )
}
