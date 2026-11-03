"use client"

import { useState, type ReactNode } from "react"
import {
  BatteryFull,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Camera,
  Cast,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Forward,
  Globe2,
  Heart,
  House,
  ImageIcon,
  Mail,
  Menu,
  MessageCircle,
  MessageSquareMore,
  MessageSquareText,
  MoreHorizontal,
  MoreVertical,
  Music,
  Play,
  Plus,
  Repeat2,
  Search,
  Send,
  Share,
  Signal,
  SquarePen,
  SquarePlus,
  Store,
  ThumbsDown,
  ThumbsUp,
  TvMinimalPlay,
  User,
  UsersRound,
  Wifi,
} from "lucide-react"
import {
  PLATFORM_RULES,
  type Account,
  type Platform,
  type PostKind,
  type PostMedia,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Avatar } from "@/components/interface"
import { PlatformIcon } from "@/components/platform-icon"
import { PlayableMedia, useYouTubeShort } from "./post-media"

/** How each app colours links, @mentions and #hashtags. */
const LINK: Record<Platform, string> = {
  instagram: "text-[#00376b] dark:text-[#e0f1ff]",
  facebook: "text-[#0064d1] dark:text-[#5aa7ff]",
  linkedin: "text-[#0a66c2] dark:text-[#71b7fb]",
  twitter: "text-[#1d9bf0]",
  threads: "text-[#0095f6]",
  youtube: "text-[#065fd4] dark:text-[#3ea6ff]",
}

// The capture group keeps each link, mention and hashtag when splitting.
const TOKEN =
  /((?:https?:\/\/|www\.)\S+|(?<![\p{L}\p{N}_])[@#][\p{L}\p{N}_]+(?:\.[\p{L}\p{N}_]+)*)/u

/** Text with its links, mentions and hashtags in the app's colour. */
export function RichText({
  text,
  platform,
}: {
  text: string
  platform: Platform
}) {
  return text.split(TOKEN).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className={LINK[platform]}>
        {part}
      </span>
    ) : (
      part
    )
  )
}

/** The text before the app cuts it off with "more", or null when it all shows. */
function excerpt(text: string, chars: number, lines: number): string | null {
  const head = text.split("\n").slice(0, lines).join("\n")
  if (head.length === text.length && text.length <= chars) return null
  if (head.length <= chars) return head.trimEnd()
  // Cut at the last whole word.
  const cut = head.slice(0, chars)
  return (cut.replace(/\s+\S*$/, "") || cut).trimEnd()
}

/** Decorative engagement, so the preview reads like a live post. */
const COUNTS = {
  likes: "1.1K",
  comments: "53",
  reposts: "78",
  shares: "12",
  views: "1.1M",
}

type PreviewProps = {
  account: Account
  caption: string
  media: PostMedia[]
  title: string | null
  kind: PostKind
  /** Whether a Facebook copy publishes as a reel. */
  reel: boolean
}

/** The post on a phone, in the app it is published to. */
export function PostPreview(props: PreviewProps) {
  const { account, kind, media } = props
  const short = useYouTubeShort(media)
  if (account.platform === "youtube" && short)
    return (
      <Phone label="YouTube Shorts preview" className="dark bg-black">
        <Short {...props} />
        <TabBar account={account} active={1} />
      </Phone>
    )
  if (account.platform === "facebook" && props.reel)
    return (
      <Phone label="Facebook Reels preview" className="dark bg-black">
        <FacebookReel {...props} />
        <TabBar account={account} active={1} />
      </Phone>
    )
  if (kind === "story")
    return (
      <Phone label="Instagram story preview" className="bg-black text-white">
        <StatusBar />
        <Story {...props} />
      </Phone>
    )
  return (
    <Phone label={`${PLATFORM_RULES[account.platform].name} post preview`}>
      <StatusBar />
      <AppBar account={account} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Post {...props} />
      </div>
      <TabBar account={account} />
    </Phone>
  )
}

function Phone({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <article
      aria-label={label}
      className={cn(
        "mx-auto flex h-full max-h-[852px] min-h-[560px] w-full max-w-[393px] flex-col overflow-hidden rounded-[2.25rem] border bg-background text-foreground shadow-sm select-none",
        className
      )}
    >
      {children}
    </article>
  )
}

function StatusBar() {
  return (
    <div
      aria-hidden="true"
      className="flex h-10 shrink-0 items-center justify-between px-8 pt-1 text-[13px] font-semibold"
    >
      9:41
      <span className="flex items-center gap-1 [&_svg]:size-3.5">
        <Signal />
        <Wifi />
        <BatteryFull />
      </span>
    </div>
  )
}

function AppBar({ account }: { account: Account }) {
  const name = account.displayName || account.username
  switch (account.platform) {
    case "twitter":
      return (
        <div aria-hidden="true" className="shrink-0 border-b">
          <div className="relative flex h-11 items-center justify-center">
            <Avatar
              src={account.profilePictureUrl}
              name={name}
              className="absolute left-4 size-8"
            />
            <PlatformIcon platform="twitter" size={22} />
          </div>
          <div className="grid grid-cols-2 text-[15px]">
            <span className="relative py-3 text-center font-bold">
              For you
              <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-[#1d9bf0]" />
            </span>
            <span className="py-3 text-center font-medium text-muted-foreground">
              Following
            </span>
          </div>
        </div>
      )
    case "threads":
      return (
        <div
          aria-hidden="true"
          className="flex h-12 shrink-0 items-center justify-center"
        >
          <PlatformIcon platform="threads" size={28} />
        </div>
      )
    case "instagram":
      return (
        <div
          aria-hidden="true"
          className="flex h-12 shrink-0 items-center gap-5 px-4 [&_svg]:size-6"
        >
          <span className="mr-auto [font-family:'Snell_Roundhand','Brush_Script_MT',cursive] text-[27px] leading-none font-bold">
            Instagram
          </span>
          <Heart />
          <Send />
        </div>
      )
    case "linkedin":
      return (
        <div
          aria-hidden="true"
          className="flex h-12 shrink-0 items-center gap-3 border-b px-3"
        >
          <Avatar
            src={account.profilePictureUrl}
            name={name}
            className="size-8"
          />
          <span className="flex h-8 flex-1 items-center gap-2 rounded-md bg-muted px-3 text-sm text-muted-foreground">
            <Search className="size-4" />
            Search
          </span>
          <MessageSquareMore className="size-6 text-muted-foreground" />
        </div>
      )
    case "facebook":
      return (
        <div
          aria-hidden="true"
          className="flex h-12 shrink-0 items-center gap-2 border-b px-4"
        >
          <span className="mr-auto text-[28px] leading-none font-bold tracking-tighter text-[#0866ff]">
            facebook
          </span>
          {[Plus, Search, MessageCircle].map((Icon, index) => (
            <span
              key={index}
              className="grid size-9 place-items-center rounded-full bg-muted"
            >
              <Icon className="size-5" />
            </span>
          ))}
        </div>
      )
    case "youtube":
      return (
        <div
          aria-hidden="true"
          className="flex h-12 shrink-0 items-center gap-5 px-3 [&>svg]:size-5"
        >
          <span className="mr-auto flex items-center gap-1 text-lg font-semibold tracking-tighter">
            <PlatformIcon
              platform="youtube"
              size={26}
              className="text-[#f00]"
            />
            YouTube
          </span>
          <Cast />
          <Bell />
          <Search />
        </div>
      )
  }
}

const TABS: Record<Platform, (typeof House)[]> = {
  instagram: [House, Search, SquarePlus, Clapperboard],
  facebook: [House, Clapperboard, UsersRound, Store, Bell, Menu],
  linkedin: [House, UsersRound, SquarePlus, Bell, BriefcaseBusiness],
  twitter: [House, Search, Bell, Mail],
  threads: [House, Search, SquarePen, Heart, User],
  youtube: [House, Clapperboard, Plus, TvMinimalPlay],
}

function TabBar({
  account,
  active = 0,
}: {
  account: Account
  /** The tab the app is on. */
  active?: number
}) {
  const avatar =
    account.platform === "instagram" || account.platform === "youtube"
  return (
    <div aria-hidden="true" className="shrink-0 border-t">
      <div className="flex h-12 items-center justify-around text-muted-foreground [&_svg]:size-6">
        {TABS[account.platform].map((Icon, index) => (
          <Icon
            key={index}
            className={cn(index === active && "text-foreground")}
          />
        ))}
        {avatar && (
          <Avatar
            src={account.profilePictureUrl}
            name={account.username}
            className="size-6"
          />
        )}
      </div>
      <div className="mx-auto mt-1 mb-2 h-1 w-32 rounded-full bg-foreground/80" />
    </div>
  )
}

function Post({ account, caption, media, title }: PreviewProps) {
  const { platform } = account
  const name = account.displayName || account.username
  const empty = (
    <span className="text-muted-foreground">Start writing to see it here.</span>
  )
  const text = (
    className: string,
    chars: number,
    lines: number,
    more: string,
    prefix?: ReactNode
  ) => (
    <Caption
      text={caption}
      platform={platform}
      chars={chars}
      lines={lines}
      more={more}
      prefix={prefix}
      empty={empty}
      className={className}
    />
  )

  if (platform === "twitter" || platform === "threads") {
    const x = platform === "twitter"
    return (
      <div className="flex gap-2.5 border-b px-4 pt-3 pb-2.5">
        <Avatar
          src={account.profilePictureUrl}
          name={name}
          className={x ? "size-10" : "size-9"}
        />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1 text-[15px] leading-5">
            <span className="truncate font-bold">
              {x ? name : account.username}
            </span>
            {x && (
              <span className="truncate text-muted-foreground">
                @{account.username}
              </span>
            )}
            <span className="shrink-0 text-muted-foreground">
              {x ? "· now" : "now"}
            </span>
            <MoreHorizontal className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </p>
          {text("mt-0.5 text-[15px] leading-5", Infinity, Infinity, "")}
          <PreviewMedia
            media={media}
            platform={platform}
            className="mt-3 rounded-2xl border"
          />
          <div
            aria-hidden="true"
            className={cn(
              "mt-3 flex items-center text-[13px] text-muted-foreground [&_span]:flex [&_span]:items-center [&_span]:gap-1 [&_svg]:size-[18px]",
              x ? "justify-between" : "gap-5"
            )}
          >
            {x ? (
              <>
                <span>
                  <MessageCircle />
                  {COUNTS.comments}
                </span>
                <span>
                  <Repeat2 />
                  {COUNTS.reposts}
                </span>
                <span>
                  <Heart />
                  {COUNTS.likes}
                </span>
                <span>
                  <ChartNoAxesColumn />
                  {COUNTS.views}
                </span>
                <Share />
              </>
            ) : (
              <>
                <span>
                  <Heart />
                  {COUNTS.likes}
                </span>
                <span>
                  <MessageCircle />
                  {COUNTS.comments}
                </span>
                <span>
                  <Repeat2 />
                  {COUNTS.reposts}
                </span>
                <span>
                  <Send />
                  {COUNTS.shares}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (platform === "instagram")
    return (
      <div className="pb-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className="rounded-full bg-linear-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px]">
            <Avatar
              src={account.profilePictureUrl}
              name={account.username}
              className="size-8 ring-2 ring-background"
            />
          </span>
          <span className="truncate text-[13px] font-semibold">
            {account.username}
          </span>
          <MoreHorizontal className="ml-auto size-5 shrink-0" />
        </div>
        <PreviewMedia media={media} platform={platform} />
        <div
          aria-hidden="true"
          className="flex items-center gap-4 px-3 pt-3 text-[13px] font-semibold [&_span]:flex [&_span]:items-center [&_span]:gap-1.5 [&_svg]:size-6"
        >
          <span>
            <Heart />
            {COUNTS.likes}
          </span>
          <span>
            <MessageCircle className="-scale-x-100" />
            {COUNTS.comments}
          </span>
          <span>
            <Repeat2 />
            {COUNTS.reposts}
          </span>
          <span>
            <Send />
            {COUNTS.shares}
          </span>
          <Bookmark className="ml-auto" />
        </div>
        {text(
          "px-3 pt-2 text-[13px] leading-[18px]",
          125,
          2,
          "more",
          caption && (
            <span className="mr-1 font-semibold">{account.username}</span>
          )
        )}
        <p className="px-3 pt-1.5 text-[11px] text-muted-foreground">
          Just now
        </p>
      </div>
    )

  if (platform === "youtube")
    return (
      <div className="pb-4">
        <PreviewMedia media={media} platform={platform} />
        <div className="px-3 pt-3">
          <p
            className={cn(
              "line-clamp-2 text-base leading-snug font-semibold [overflow-wrap:anywhere]",
              !title && "text-muted-foreground"
            )}
          >
            {title || "Your video title"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {COUNTS.views} views · Just now
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Avatar
              src={account.profilePictureUrl}
              name={name}
              className="size-8"
            />
            <span className="truncate text-sm font-semibold">{name}</span>
            <span className="shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background">
              Subscribe
            </span>
          </div>
          <div
            aria-hidden="true"
            className="mt-3 flex gap-2 overflow-hidden text-sm font-medium [&_svg]:size-4 [&>span]:flex [&>span]:h-8 [&>span]:shrink-0 [&>span]:items-center [&>span]:gap-1.5 [&>span]:rounded-full [&>span]:bg-muted [&>span]:px-3"
          >
            <span>
              <ThumbsUp />
              {COUNTS.likes}
              <span className="mx-1 h-5 w-px bg-border" />
              <ThumbsDown />
            </span>
            <span>
              <Forward />
              Share
            </span>
            <span>
              <Download />
              Download
            </span>
          </div>
          {text(
            "mt-3 rounded-xl bg-muted p-3 text-[13px] leading-[18px]",
            160,
            3,
            "...more"
          )}
        </div>
      </div>
    )

  const linkedin = platform === "linkedin"
  return (
    <div className="border-b pb-1">
      <div className="flex gap-2 px-3 pt-3">
        <Avatar
          src={account.profilePictureUrl}
          name={name}
          className={linkedin ? "size-12" : "size-10"}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p
            className={cn(
              "truncate font-semibold",
              linkedin ? "text-sm" : "text-[15px]"
            )}
          >
            {name}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            Just now ·
            <Globe2 className="size-3" />
          </p>
        </div>
        <MoreHorizontal className="size-5 shrink-0 text-muted-foreground" />
      </div>
      {linkedin
        ? text("px-3 pt-2 pb-2 text-sm leading-5", 210, 3, "more")
        : text("px-3 pt-2 pb-2 text-[15px] leading-5", 480, 5, "See more")}
      <PreviewMedia media={media} platform={platform} />
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="flex -space-x-1">
            <span className="grid size-4 place-items-center rounded-full bg-[#378fe9] text-white ring-2 ring-background">
              <ThumbsUp className="size-2.5 fill-current" />
            </span>
            <span className="grid size-4 place-items-center rounded-full bg-[#f3425f] text-white ring-2 ring-background">
              <Heart className="size-2.5 fill-current" />
            </span>
          </span>
          {COUNTS.likes}
        </span>
        <span>
          {COUNTS.comments} comments · {COUNTS.shares}{" "}
          {linkedin ? "reposts" : "shares"}
        </span>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "mx-3 grid border-t py-1 font-semibold text-muted-foreground [&_svg]:size-5",
          linkedin
            ? "grid-cols-4 text-[11px] [&>span]:flex-col [&>span]:gap-1"
            : "grid-cols-3 text-[13px] [&>span]:gap-1.5"
        )}
      >
        <span className="flex items-center justify-center py-1.5">
          <ThumbsUp />
          Like
        </span>
        <span className="flex items-center justify-center py-1.5">
          <MessageCircle />
          Comment
        </span>
        {linkedin && (
          <span className="flex items-center justify-center py-1.5">
            <Repeat2 />
            Repost
          </span>
        )}
        <span className="flex items-center justify-center py-1.5">
          {linkedin ? <Send /> : <Forward />}
          {linkedin ? "Send" : "Share"}
        </span>
      </div>
    </div>
  )
}

/** A caption cut off where the app shows "more", which opens the rest. */
function Caption({
  text,
  platform,
  chars,
  lines,
  more,
  prefix,
  empty,
  className,
}: {
  text: string
  platform: Platform
  chars: number
  lines: number
  more: string
  prefix?: ReactNode
  empty: ReactNode
  className: string
}) {
  const [open, setOpen] = useState(false)
  const short = open ? null : excerpt(text, chars, lines)
  return (
    <p
      className={cn(
        "[overflow-wrap:anywhere] whitespace-pre-wrap select-text",
        className
      )}
    >
      {prefix}
      {text ? <RichText text={short ?? text} platform={platform} /> : empty}
      {short !== null && (
        <>
          {"… "}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:underline"
          >
            {more}
          </button>
        </>
      )}
    </p>
  )
}

/** A Short fills the screen, with its channel and title over the video. */
function Short({ account, media, title }: PreviewProps) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden text-white">
      <PlayableMedia media={media[0]!} className="object-contain" />
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/40 to-transparent">
        <StatusBar />
        <div
          aria-hidden="true"
          className="flex h-11 items-center justify-end gap-5 px-4 [&_svg]:size-6"
        >
          <Search />
          <MoreVertical />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 bg-linear-to-t from-black/60 to-transparent px-3 pt-20 pb-4">
        <div className="grid min-w-0 flex-1 gap-2.5">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Avatar
              src={account.profilePictureUrl}
              name={account.username}
              className="size-8"
            />
            <span className="truncate">@{account.username}</span>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black">
              Subscribe
            </span>
          </p>
          <p
            className={cn(
              "line-clamp-2 text-sm leading-snug [overflow-wrap:anywhere]",
              !title && "text-white/60"
            )}
          >
            {title || "Your video title"}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="grid shrink-0 justify-items-center gap-3.5 text-xs font-medium [&_svg]:size-6 [&>span]:grid [&>span]:justify-items-center [&>span]:gap-1"
        >
          <span>
            <ThumbsUp className="fill-current" />
            {COUNTS.likes}
          </span>
          <span>
            <ThumbsDown className="fill-current" />
            Dislike
          </span>
          <span>
            <MessageSquareText className="fill-current" />
            {COUNTS.comments}
          </span>
          <span>
            <Forward className="fill-current" />
            Share
          </span>
          <span>
            <Repeat2 />
            Remix
          </span>
          <Avatar
            src={account.profilePictureUrl}
            name={account.username}
            className="size-9 rounded-md border-2 border-white"
          />
        </div>
      </div>
    </div>
  )
}

/** A reel fills the screen, with the Page and caption over the video. */
function FacebookReel({ account, caption, media }: PreviewProps) {
  const name = account.displayName || account.username
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden text-white">
      {media[0] ? (
        <PlayableMedia media={media[0]} className="object-contain" />
      ) : (
        <div className="grid h-full place-content-center gap-2 text-center text-white/50">
          <Clapperboard className="mx-auto size-7" />
          <p className="text-xs">Your reel appears here</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/40 to-transparent">
        <StatusBar />
        <div
          aria-hidden="true"
          className="flex h-11 items-center gap-5 px-4 [&_svg]:size-6"
        >
          <span className="mr-auto text-xl font-bold">Reels</span>
          <Search />
          <Camera />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 bg-linear-to-t from-black/60 to-transparent px-3 pt-20 pb-4">
        <div className="grid min-w-0 flex-1 gap-2">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Avatar
              src={account.profilePictureUrl}
              name={name}
              className="size-8"
            />
            <span className="truncate">{name}</span>
            <span className="shrink-0">· Follow</span>
          </p>
          {caption && (
            <p className="line-clamp-2 text-sm leading-snug [overflow-wrap:anywhere] whitespace-pre-wrap">
              {caption}
            </p>
          )}
          <p className="flex min-w-0 items-center gap-1.5 text-xs">
            <Music className="size-3.5 shrink-0" />
            <span className="truncate">{name} · Original audio</span>
          </p>
        </div>
        <div
          aria-hidden="true"
          className="grid shrink-0 justify-items-center gap-4 text-xs font-medium [&_svg]:size-7 [&>span]:grid [&>span]:justify-items-center [&>span]:gap-1"
        >
          <span>
            <ThumbsUp className="fill-current" />
            {COUNTS.likes}
          </span>
          <span>
            <MessageCircle className="fill-current" />
            {COUNTS.comments}
          </span>
          <span>
            <Forward className="fill-current" />
            {COUNTS.shares}
          </span>
          <MoreHorizontal />
        </div>
      </div>
    </div>
  )
}

function Story({ account, media }: PreviewProps) {
  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-neutral-900">
        {media[0] ? (
          <PlayableMedia media={media[0]} />
        ) : (
          <div className="grid h-full place-content-center gap-2 text-center text-white/50">
            <ImageIcon className="mx-auto size-7" />
            <p className="text-xs">Your story appears here</p>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 grid gap-2.5 bg-linear-to-b from-black/50 to-transparent p-3">
          <span className="h-0.5 rounded-full bg-white/90" />
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <Avatar
              src={account.profilePictureUrl}
              name={account.username}
              className="size-8"
            />
            {account.username}
            <span className="font-normal text-white/70">1m</span>
          </span>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="flex shrink-0 items-center gap-3 px-3 pt-2.5 pb-1 [&_svg]:size-6"
      >
        <span className="flex-1 rounded-full border border-white/40 px-4 py-2 text-[13px] text-white/80">
          Send message
        </span>
        <Heart />
        <Send />
      </div>
      <div className="mx-auto mt-2 mb-2 h-1 w-32 shrink-0 rounded-full bg-white/80" />
    </>
  )
}

function PreviewMedia({
  media,
  platform,
  className,
}: {
  media: PostMedia[]
  platform: Platform
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const current = Math.min(index, Math.max(0, media.length - 1))
  const item = media[current]
  const instagram = platform === "instagram"
  const youtube = platform === "youtube"
  if (!item && !instagram && !youtube) return null
  if (
    media.length > 1 &&
    (platform === "facebook" ||
      platform === "linkedin" ||
      platform === "twitter")
  )
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-0.5 overflow-hidden bg-muted",
          platform === "twitter" ? "aspect-video" : "aspect-square",
          className
        )}
      >
        {media.slice(0, 4).map((attachment, position) => (
          <div
            key={attachment.url}
            className={cn(
              "relative min-h-0 bg-muted",
              media.length === 3 && position === 0 && "row-span-2"
            )}
          >
            <PlayableMedia media={attachment} />
            {position === 3 && media.length > 4 && (
              <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/50 text-lg font-medium text-white">
                +{media.length - 4}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  // YouTube's player shows the whole video, with bars where it doesn't fit.
  const letterbox = youtube && item?.type === "video"
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        instagram ? "aspect-[4/5]" : "aspect-video",
        letterbox && "bg-black",
        className
      )}
    >
      {item ? (
        <PlayableMedia
          media={item}
          className={letterbox ? "object-contain" : undefined}
        />
      ) : (
        <div className="absolute inset-0 grid place-content-center gap-2 text-center text-muted-foreground">
          {youtube ? (
            <Play className="mx-auto size-7" />
          ) : (
            <ImageIcon className="mx-auto size-7" />
          )}
          <p className="text-xs">
            {youtube ? "Your video appears here" : "Your photo or video"}
          </p>
        </div>
      )}
      {media.length > 1 && (
        <>
          <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
            {current + 1}/{media.length}
          </span>
          {current > 0 && (
            <button
              type="button"
              aria-label="Previous preview image"
              onClick={() => setIndex(current - 1)}
              className="absolute top-1/2 left-2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {current < media.length - 1 && (
            <button
              type="button"
              aria-label="Next preview image"
              onClick={() => setIndex(current + 1)}
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
