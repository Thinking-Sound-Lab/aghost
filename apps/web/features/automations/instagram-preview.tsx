import Image from "next/image"
import {
  BatteryFull,
  Bookmark,
  Camera,
  ChevronLeft,
  Clapperboard,
  Heart,
  House,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Phone,
  Search,
  Send,
  Signal,
  Smile,
  SquarePlus,
  Video,
  Wifi,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { OpeningDm } from "@workspace/api/contract"

// A stand-in commenter, so personalised messages read naturally.
const SAMPLE = { first_name: "Alex", name: "Alex Rivera", username: "alex" }

type Account = { username: string; picture: string | null }
type Post = {
  thumbnailUrl: string | null
  /** A video to play in place of the thumbnail. */
  videoUrl?: string | null
  caption: string | null
  likeCount: number | null
} | null

export function InstagramPreview({
  screen,
  account,
  post,
  keyword,
  commentReply,
  openingDm,
  dmMessage,
  buttons,
}: {
  screen: "post" | "dm" | "story"
  account: Account
  post: Post
  keyword: string | null
  commentReply: string | null
  openingDm: OpeningDm | null
  dmMessage: string
  buttons: string[]
}) {
  return (
    <div className="h-[620px] w-[300px] shrink-0 rounded-[46px] bg-neutral-950 p-2.5 shadow-2xl ring-1 ring-black/10">
      <div className="flex h-full flex-col overflow-hidden rounded-[38px] bg-black text-white">
        <div className="flex items-center justify-between px-7 pt-3 pb-1 text-[13px] font-semibold">
          9:41
          <span className="flex items-center gap-1 [&_svg]:size-3.5">
            <Signal />
            <Wifi />
            <BatteryFull />
          </span>
        </div>
        {screen === "story" ? (
          <StoryScreen account={account} post={post} />
        ) : screen === "post" ? (
          <PostScreen
            account={account}
            post={post}
            keyword={keyword}
            commentReply={commentReply}
          />
        ) : (
          <DmScreen
            account={account}
            openingDm={openingDm}
            dmMessage={dmMessage}
            buttons={buttons}
          />
        )}
        <div className="mx-auto mt-1 mb-2 h-1 w-28 shrink-0 rounded-full bg-white/80" />
      </div>
    </div>
  )
}

function PostScreen({
  account,
  post,
  keyword,
  commentReply,
}: {
  account: Account
  post: Post
  keyword: string | null
  commentReply: string | null
}) {
  return (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5">
        <ChevronLeft className="size-6" />
        <div className="text-center leading-tight">
          <p className="text-[10px] font-semibold text-white/60 uppercase">
            {account.username}
          </p>
          <p className="text-[15px] font-semibold">Posts</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <Avatar account={account} ring />
          <span className="text-[13px] font-semibold">{account.username}</span>
          <MoreHorizontal className="ml-auto size-4" />
        </div>
        <div className="relative aspect-square bg-neutral-900">
          <Media post={post} />
        </div>
        <div className="flex items-center gap-3.5 px-3 pt-2.5 [&_svg]:size-[22px]">
          <Heart />
          <MessageCircle className="-scale-x-100" />
          <Send />
          <Bookmark className="ml-auto" />
        </div>
        {post?.likeCount != null && (
          <p className="px-3 pt-1.5 text-[13px] font-semibold">
            {post.likeCount.toLocaleString()} likes
          </p>
        )}
        {post?.caption && (
          <p className="line-clamp-2 px-3 pt-1 text-[13px]">
            <b>{account.username}</b> {post.caption}
          </p>
        )}
        <p className="px-3 pt-1.5 text-[13px]">
          <b>{SAMPLE.username}</b> {keyword ?? "Love this!"}
        </p>
        {commentReply && (
          <p className="line-clamp-2 py-1 pr-3 pl-7 text-[13px]">
            <b>{account.username}</b> {personalize(commentReply)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-around py-2.5 [&_svg]:size-6">
        <House />
        <Search />
        <SquarePlus />
        <Clapperboard />
        <Avatar account={account} small />
      </div>
    </>
  )
}

function StoryScreen({ account, post }: { account: Account; post: Post }) {
  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-neutral-900">
        <Media post={post} />
        <div className="absolute inset-x-0 top-0 grid gap-2 bg-linear-to-b from-black/50 to-transparent p-2.5">
          <span className="h-0.5 rounded-full bg-white/90" />
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <Avatar account={account} small />
            {account.username}
            <span className="font-normal text-white/70">1m</span>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 px-3 py-2.5 [&_svg]:size-6">
        <span className="flex-1 rounded-full border border-white/40 px-4 py-2 text-[13px] text-white/80">
          Send message
        </span>
        <Heart />
        <Send />
      </div>
    </>
  )
}

/** The post's photo, or its video playing silently on a loop. */
function Media({ post }: { post: Post }) {
  if (post?.videoUrl)
    return (
      <video
        src={post.videoUrl}
        muted
        loop
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
    )
  if (post?.thumbnailUrl)
    return (
      <Image
        src={post.thumbnailUrl}
        alt=""
        fill
        unoptimized
        className="object-cover"
      />
    )
  return null
}

function DmScreen({
  account,
  openingDm,
  dmMessage,
  buttons,
}: {
  account: Account
  openingDm: OpeningDm | null
  dmMessage: string
  buttons: string[]
}) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-2.5 px-3 py-2">
        <ChevronLeft className="size-6" />
        <Avatar account={account} />
        <span className="text-[14px] font-semibold">{account.username}</span>
        <span className="ml-auto flex gap-4 [&_svg]:size-5">
          <Phone />
          <Video />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 py-3">
        {openingDm && (
          <>
            <Received account={account} text={openingDm.message}>
              {[openingDm.buttonLabel]}
            </Received>
            <p className="ml-auto max-w-[75%] rounded-[18px] bg-linear-to-br from-[#a033ff] to-[#5b5bf8] px-3 py-2 text-[13px]">
              {openingDm.buttonLabel || "…"}
            </p>
          </>
        )}
        <Received account={account} text={dmMessage}>
          {buttons}
        </Received>
      </div>
      <div className="mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-full bg-neutral-900 p-1.5 pr-3 [&_svg]:size-5">
        <span className="grid size-8 place-items-center rounded-full bg-[#3797f0]">
          <Camera className="size-4!" />
        </span>
        <span className="flex-1 text-[13px] text-white/50">Message...</span>
        <Mic />
        <ImageIcon />
        <Smile />
      </div>
    </>
  )
}

function Received({
  account,
  text,
  children: buttons,
}: {
  account: Account
  text: string
  children: string[]
}) {
  return (
    <div className="flex items-end gap-1.5">
      <Avatar account={account} small />
      <div className="max-w-[78%] overflow-hidden rounded-[18px] bg-neutral-800 text-[13px]">
        <p className="px-3 py-2 break-words whitespace-pre-line">
          {personalize(text) || "…"}
        </p>
        {buttons.map((label, index) => (
          <p
            key={index}
            className="border-t border-white/10 px-3 py-2 text-center font-semibold"
          >
            {label || "Button"}
          </p>
        ))}
      </div>
    </div>
  )
}

function Avatar({
  account,
  ring = false,
  small = false,
}: {
  account: Account
  ring?: boolean
  small?: boolean
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-700 text-[10px] font-semibold uppercase",
        small ? "size-6" : "size-8",
        ring && "ring-2 ring-[#e1306c] ring-offset-2 ring-offset-black"
      )}
    >
      {account.picture ? (
        <Image
          src={account.picture}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        account.username.charAt(0)
      )}
    </span>
  )
}

function personalize(text: string): string {
  return text.replace(
    /\{\{(first_name|name|username)\}\}/g,
    (_, key: keyof typeof SAMPLE) => SAMPLE[key]
  )
}
