import { Check, Heart, Lock, Search } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Mascot } from "@/components/brand"
import { Instagram } from "@/components/instagram-icon"

// Small, static pictures of the product for the marketing page. They are
// decorative: every claim they illustrate is also written in the text beside
// them, so screen readers skip them.

function Face({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function Brand() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black">
      <Mascot size={20} />
    </span>
  )
}

/** A message the commenter receives, with optional buttons below it. */
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
      <div className="max-w-56 overflow-hidden rounded-2xl bg-white text-[13px] shadow-sm ring-1 ring-black/10">
        <p className="px-3 py-2">{text}</p>
        {buttons.map((label) => (
          <p
            key={label}
            className="border-t border-black/10 px-3 py-2 text-center font-semibold"
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
    <p className="ml-auto w-fit rounded-2xl bg-linear-to-br from-[#a033ff] to-[#5b5bf8] px-3 py-2 text-[13px] text-white">
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
    <div className={cn("flex items-start gap-2", reply && "ml-9")}>
      {face ? <Face name={name} className={face} /> : <Brand />}
      <div className="min-w-0 flex-1 text-[13px]">
        <p>
          <b>{name}</b> {text}
        </p>
        <p className="text-xs text-black/45">now · Reply</p>
      </div>
      <Heart className="mt-1 size-3.5 text-black/40" />
    </div>
  )
}

/** The frame every card picture sits in. */
export function Scene({
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
        "grid h-44 content-center gap-2.5 overflow-hidden px-5",
        className
      )}
    >
      {children}
    </div>
  )
}

export const stepScenes = [
  <>
    <div className="mx-auto flex items-center gap-3">
      <span className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
        <Instagram size={28} />
      </span>
      <span className="text-2xl text-black/30">+</span>
      <span className="grid size-12 place-items-center rounded-2xl bg-black">
        <Mascot size={36} />
      </span>
    </div>
    <p className="mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium ring-1 ring-black/10">
      <span className="size-2 rounded-full bg-brand" />
      Connected · @studio.maya
    </p>
  </>,
  <>
    <div className="mx-auto flex flex-wrap justify-center gap-2">
      {["GUIDE", "LINK", "PRICE"].map((keyword) => (
        <span
          key={keyword}
          className="rounded-full bg-black px-3 py-1 text-[13px] font-semibold text-white"
        >
          {keyword}
        </span>
      ))}
    </div>
    <p className="mx-auto flex w-fit rounded-full bg-white p-1 text-xs font-medium ring-1 ring-black/10">
      {["Contains", "Whole word", "Exact"].map((mode) => (
        <span
          key={mode}
          className={cn(
            "rounded-full px-2.5 py-1",
            mode === "Whole word" ? "bg-brand" : "text-black/50"
          )}
        >
          {mode}
        </span>
      ))}
    </p>
  </>,
  <>
    <Received text="Here's your guide, Alex ✨" buttons={["Download"]} />
    <p className="ml-9 flex w-fit items-center gap-1.5 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
      <Check className="size-3.5 text-brand" strokeWidth={3} />
      Sent automatically
    </p>
  </>,
]

export const featureScenes = [
  <>
    <Comment name="alex" text="GUIDE 🙌" face="bg-brand-orange" />
    <Comment name="sam.k" text="guide please!" face="bg-brand-cyan" />
  </>,
  <>
    <Comment name="alex" text="GUIDE 🙌" face="bg-brand-orange" />
    <Comment name="aghost" text="Sent you a DM, Alex ✨" reply />
  </>,
  <>
    <Received
      text="Thanks for the comment! 💬"
      buttons={["Send me the guide"]}
    />
    <Sent text="Send me the guide" />
  </>,
  <Received
    text="Pick what you need 👇"
    buttons={["Free guide", "Book a call"]}
  />,
  <>
    <Received
      text="Follow @studio.maya to unlock 🔒"
      buttons={["I'm following"]}
    />
    <Sent text="I'm following" />
  </>,
  <div className="grid gap-1.5 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/10">
    {[
      {
        name: "sarah",
        text: "link please 🙏",
        face: "bg-brand-red text-white",
      },
      { name: "devon", text: "got it, thank you!", face: "bg-brand-cyan" },
    ].map((row) => (
      <div key={row.name} className="flex items-center gap-2 px-1 text-[13px]">
        <Face name={row.name} className={row.face} />
        <span className="min-w-0 flex-1 truncate">
          <b>{row.name}</b> {row.text}
        </span>
        <span className="text-xs text-black/40">2m</span>
      </div>
    ))}
  </div>,
]

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
    <div
      aria-hidden
      className="rounded-[2rem] bg-linear-to-br from-brand via-brand-cyan to-brand-blue p-5 sm:p-8"
    >
      <div className="rounded-2xl bg-white p-5 shadow-2xl shadow-black/20">
        <p className="text-sm font-semibold">Free guide · Activity</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
    </div>
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
    <div
      aria-hidden
      className="rounded-[2rem] bg-linear-to-br from-brand-orange via-brand-red to-brand-blue p-5 sm:p-8"
    >
      <div className="grid overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20 sm:grid-cols-[12rem_1fr]">
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
    </div>
  )
}

/** Instagram's login, and the rules aghost keeps. */
export function SafetyScene() {
  const rules = [
    "One private reply per comment",
    "Within 7 days of the comment",
    "More messages only after they reply",
  ]
  return (
    <div
      aria-hidden
      className="grid gap-5 rounded-[2rem] bg-white p-8 shadow-xl ring-1 shadow-black/5 ring-black/10"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
          <Instagram size={28} />
        </span>
        <div>
          <p className="font-semibold">Log in with Instagram</p>
          <p className="flex items-center gap-1.5 text-sm text-brand-gray">
            <Lock className="size-3.5" />
            Your password stays with Instagram
          </p>
        </div>
      </div>
      <ul className="grid gap-2.5 border-t border-black/5 pt-5 text-sm">
        {rules.map((rule) => (
          <li key={rule} className="flex items-center gap-2.5">
            <span className="grid size-5 place-items-center rounded-full bg-brand">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {rule}
          </li>
        ))}
      </ul>
    </div>
  )
}
