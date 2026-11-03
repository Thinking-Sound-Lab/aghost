import { Check, Heart, Search } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Monogram } from "@/components/brand"

// Small, static pictures of the product for the marketing pages. They are
// decorative: every claim they illustrate is also written in the text beside
// them, so screen readers skip them.

function Face({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-black",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function Brand() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-black">
      <Monogram className="size-5" />
    </span>
  )
}

/** A message the commenter receives, in Instagram's dark theme. */
function Received({
  text,
  buttons = [],
}: {
  text: string
  buttons?: string[]
}) {
  return (
    <div className="flex items-end gap-2">
      <Brand />
      <div className="max-w-60 overflow-hidden rounded-2xl bg-[#262626] text-[13px] text-white">
        <p className="px-3.5 py-2.5">{text}</p>
        {buttons.map((label) => (
          <p
            key={label}
            className="border-t border-white/10 px-3.5 py-2.5 text-center font-semibold"
          >
            {label}
          </p>
        ))}
      </div>
    </div>
  )
}

function Sent({ text }: { text: string }) {
  return (
    <p className="ml-auto w-fit rounded-2xl bg-linear-to-br from-[#a033ff] to-[#5b5bf8] px-3.5 py-2.5 text-[13px] text-white">
      {text}
    </p>
  )
}

function Comment({
  name,
  text,
  face,
  reply = false,
}: {
  name: string
  text: string
  face?: string
  reply?: boolean
}) {
  return (
    <div className={cn("flex items-start gap-2.5", reply && "ml-9")}>
      {face ? <Face name={name} className={face} /> : <Brand />}
      <div className="min-w-0 flex-1 text-[13px] text-white">
        <p>
          <b>{name}</b> {text}
        </p>
        <p className="text-xs text-white/45">now · Reply</p>
      </div>
      <Heart className="mt-1 size-3.5 text-white/40" />
    </div>
  )
}

/** A desktop window: three dots, a title, and its contents. */
function Window({
  title,
  light = false,
  className,
  children,
}: {
  title: string
  light?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40",
        light
          ? "bg-white text-black ring-1 ring-black/10"
          : "bg-[#141414] text-white ring-1 ring-white/10",
        className
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 border-b px-4 py-3 text-xs",
          light
            ? "border-black/5 bg-brand-offwhite text-brand-gray"
            : "border-white/10 text-white/50"
        )}
      >
        <span className="size-2.5 rounded-full bg-brand-red" />
        <span className="size-2.5 rounded-full bg-brand-orange" />
        <span className="size-2.5 rounded-full bg-brand" />
        <span className="ml-3 truncate">{title}</span>
      </p>
      {children}
    </div>
  )
}

/** The black screen a feature card's picture sits on. */
export function Screen({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid min-h-56 content-center gap-3 overflow-hidden rounded-3xl bg-black/85 p-6 ring-1 ring-white/10",
        className
      )}
    >
      {children}
    </div>
  )
}

export const keywordScene = (
  <>
    <Comment name="alex" text="GUIDE 🙌" face="bg-brand-orange" />
    <Comment name="sam.k" text="guide please!" face="bg-brand-cyan" />
    <Comment name="maya" text="need this 😍 GUIDE" face="bg-brand" />
  </>
)

export const replyScene = (
  <>
    <Comment name="alex" text="GUIDE 🙌" face="bg-brand-orange" />
    <Comment name="aghost" text="Sent you a DM, Alex ✨" reply />
  </>
)

export const tapScene = (
  <>
    <Received
      text="Thanks for the comment! 💬"
      buttons={["Send me the guide"]}
    />
    <Sent text="Send me the guide" />
    <Received text="Here’s your guide ✨" buttons={["Download"]} />
  </>
)

export const buttonsScene = (
  <Received
    text="Hey Alex! Pick what you need 👇"
    buttons={["Free guide", "Book a call", "Shop the look"]}
  />
)

export const followScene = (
  <>
    <Received
      text="Follow @studio.maya to unlock the guide 🔒"
      buttons={["I’m following"]}
    />
    <Sent text="I’m following" />
  </>
)

/** A REST call that creates an automation, in the API's own shape. */
export function RestScene({ endpoint }: { endpoint: string }) {
  const body = `{
  "instagramAccountId": "…",
  "name": "Send the guide",
  "status": "paused",
  "trigger": { "postScope": "specific_post", "platformPostId": "…" },
  "keywords": ["GUIDE"],
  "matchMode": "word",
  "openingDm": null,
  "dmMessage": "Here’s your guide, {{first_name}} ✨",
  "dmButtons": [{ "label": "Get the guide", "url": "https://…" }],
  "commentReply": "Sent you a DM ✨",
  "requireFollow": false
}`
  return (
    <Window title="REST API">
      <div aria-hidden className="grid grid-cols-1 gap-4 p-5">
        <p className="flex min-w-0 items-center gap-2 font-mono text-xs">
          <span className="rounded-md bg-brand px-2 py-1 font-bold text-black">
            POST
          </span>
          <span className="truncate text-white/80">{endpoint}</span>
        </p>
        <p className="font-mono text-xs text-white/50">
          Authorization: Bearer $AGHOST_API_KEY
        </p>
        <pre className="overflow-hidden rounded-xl bg-white/5 p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-white/85 sm:text-xs">
          {body}
        </pre>
      </div>
    </Window>
  )
}

/** The activity page of one automation, as the dashboard shows it. */
export function StatsScene() {
  const tiles = [
    ["Comments", "512"],
    ["DMs sent", "498"],
    ["Link clicks", "214"],
    ["Failed", "2"],
  ]
  const rows = [
    { name: "alex", comment: "GUIDE", status: "Sent", dot: "bg-brand" },
    {
      name: "sam.k",
      comment: "guide please!",
      status: "Waiting for tap",
      dot: "bg-brand-orange",
    },
    { name: "maya", comment: "GUIDE 🔥", status: "Sent", dot: "bg-brand" },
  ]
  return (
    <Window light title="Free guide · Activity">
      <div aria-hidden className="p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-brand-offwhite p-3">
              <p className="text-xs text-brand-gray">{label}</p>
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 divide-y divide-black/5 text-[13px]">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center gap-3 py-2.5">
              <Face name={row.name} className="bg-brand-offwhite" />
              <b className="w-14 truncate">{row.name}</b>
              <span className="min-w-0 flex-1 truncate text-brand-gray">
                {row.comment}
              </span>
              <span className="flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", row.dot)} />
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Window>
  )
}

/** Product cards in the main DM, with a separate link for each product. */
export function ProductCarouselScene() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {["The creator kit", "The template pack"].map((title, index) => (
        <div
          key={title}
          className="w-36 shrink-0 overflow-hidden rounded-xl bg-white text-[12px] text-black shadow-sm ring-1 ring-black/10"
        >
          <div
            className={cn(
              "grid h-20 place-items-center",
              index === 0 ? "bg-brand/20" : "bg-brand-orange/20"
            )}
          >
            <span className="rotate-[-8deg] rounded bg-white px-3 py-2 text-lg font-bold">
              {index === 0 ? "✦" : "↗"}
            </span>
          </div>
          <p className="p-2 font-semibold">{title}</p>
          <p className="border-t border-black/10 p-2 text-center">Shop now</p>
        </div>
      ))}
    </div>
  )
}

/** One reminder after the offer, skipped once the conversation continues. */
export function FollowUpScene() {
  return (
    <>
      <p className="text-center text-[11px] text-white/50">
        1 hour later · no reply or click
      </p>
      <Received
        text="Still interested? Here's your link again 👇"
        buttons={["Get the guide"]}
      />
      <p className="flex items-center justify-center gap-1 text-[11px] text-white/50">
        <Check className="size-3" /> Stops when the conversation continues
      </p>
    </>
  )
}

/** The inbox: conversations on a grey rail, the open thread beside it. */
export function InboxScene() {
  const people = [
    { name: "sarah", text: "link please 🙏", face: "bg-brand-red text-white" },
    { name: "devon", text: "got it, thank you!", face: "bg-brand-cyan" },
    { name: "priya", text: "is this still free?", face: "bg-brand-orange" },
    { name: "leo", text: "Sent you the guide ✨", face: "bg-brand" },
  ]
  return (
    <Window light title="Inbox">
      <div
        aria-hidden
        className="grid overflow-hidden sm:grid-cols-[12rem_1fr]"
      >
        <div className="border-black/5 bg-brand-offwhite p-3 max-sm:hidden sm:border-r">
          <p className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-brand-gray ring-1 ring-black/5">
            <Search className="size-3.5" />
            Search
          </p>
          <div className="mt-2 grid gap-0.5">
            {people.map((person, index) => (
              <div
                key={person.name}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2 text-[13px]",
                  index === 0 && "bg-white shadow-sm"
                )}
              >
                <Face name={person.name} className={person.face} />
                <span className="min-w-0">
                  <b className="block">{person.name}</b>
                  <span className="block truncate text-xs text-brand-gray">
                    {person.text}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-72 flex-col gap-2 bg-white p-4">
          <p className="flex items-center gap-2 border-b border-black/5 pb-3 text-sm font-semibold">
            <Face name="sarah" className="bg-brand-red text-white" />
            sarah
          </p>
          <div className="mt-auto grid gap-2">
            <p className="w-fit max-w-60 rounded-2xl bg-brand-offwhite px-3 py-2 text-[13px]">
              link please 🙏
            </p>
            <Sent text="Here you go! ✨" />
            <p className="mt-1 rounded-full px-3 py-2 text-[13px] text-brand-gray ring-1 ring-black/10">
              Message…
            </p>
          </div>
        </div>
      </div>
    </Window>
  )
}
