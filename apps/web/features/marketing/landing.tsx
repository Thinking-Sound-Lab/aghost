import Link from "next/link"
import {
  ArrowRight,
  Check,
  Hash,
  Inbox,
  Link2,
  MousePointerClick,
  Plus,
  Reply,
  UserCheck,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Brand, Mascot } from "@/components/brand"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { faqs, features, steps } from "./content"

const PILL =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
const PRIMARY = cn(PILL, "bg-brand text-black hover:bg-brand/80")
const QUIET = cn(PILL, "text-black ring-1 ring-black/15 hover:bg-black/5")

const SECTION = "mx-auto max-w-6xl scroll-mt-6 px-6"
const HEADING = "text-3xl font-bold tracking-tight text-balance sm:text-4xl"

// The mascot's orbs, in the order they number the steps.
const ORBS = [
  "bg-brand-blue text-white",
  "bg-brand-orange text-black",
  "bg-brand-red text-white",
]

const FEATURE_ICONS = [
  { icon: Hash, orb: "bg-brand text-black" },
  { icon: Reply, orb: "bg-brand-blue text-white" },
  { icon: MousePointerClick, orb: "bg-brand-cyan text-black" },
  { icon: Link2, orb: "bg-brand-orange text-black" },
  { icon: UserCheck, orb: "bg-brand-red text-white" },
  { icon: Inbox, orb: "bg-black text-white" },
]

const sections = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
]

export function Landing() {
  return (
    <div className="overflow-x-clip bg-white text-black">
      <header className="mx-auto flex h-20 max-w-6xl items-center gap-4 px-6 md:gap-10">
        <Brand />
        <nav
          aria-label="Main"
          className="hidden gap-8 text-[15px] font-medium text-brand-gray md:flex"
        >
          {sections.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-black">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className={cn(QUIET, "hidden h-10 px-5 text-sm sm:inline-flex")}
          >
            Log in
          </Link>
          <Link href="/signup" className={cn(PRIMARY, "h-10 px-5 text-sm")}>
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main>
        <section
          className={cn(
            SECTION,
            "grid items-center gap-x-12 gap-y-16 pt-10 pb-24 lg:grid-cols-[1fr_auto] lg:pt-14"
          )}
        >
          <div className="grid max-w-2xl min-w-0 gap-6">
            <p className="flex w-fit items-center gap-2 rounded-full bg-brand/15 px-3.5 py-1.5 text-sm font-medium">
              <span className="size-2 rounded-full bg-brand" />
              Instagram DM automation
            </p>
            <h1 className="text-[2.5rem] leading-[1.05] font-bold tracking-tight min-[390px]:text-5xl sm:text-6xl">
              Turn Instagram comments into{" "}
              <span className="rounded-2xl bg-brand px-3">DMs</span>{" "}
              automatically.
            </h1>
            <p className="max-w-xl text-lg text-brand-gray">
              aghost is an Instagram DM automation tool. When someone comments
              your keyword on a post or reel, aghost replies in public and sends
              them your link by DM.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={cn(PRIMARY, "h-12 px-7")}>
                Get started
                <ArrowRight className="size-4" />
              </Link>
              <a href="#how-it-works" className={cn(QUIET, "h-12 px-7")}>
                How it works
              </a>
            </div>
          </div>
          <HeroArt />
        </section>

        <section id="how-it-works" className={SECTION}>
          <div className="rounded-[40px] bg-brand-offwhite px-6 py-14 sm:px-12">
            <h2 className={HEADING}>How comment-to-DM automation works</h2>
            <p className="mt-3 text-lg text-brand-gray">
              An automation takes three steps to set up.
            </p>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="grid content-start gap-3">
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-full font-bold",
                      ORBS[index]
                    )}
                  >
                    {index + 1}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-brand-gray">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className={cn(SECTION, "py-24")}>
          <h2 className={HEADING}>What aghost automates</h2>
          <ul className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const { icon: Icon, orb } = FEATURE_ICONS[index]!
              return (
                <li key={feature.title} className="grid content-start gap-3">
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-full",
                      orb
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-brand-gray">{feature.text}</p>
                </li>
              )
            })}
          </ul>
        </section>

        <section id="faq" className={SECTION}>
          <h2 className={HEADING}>Frequently asked questions</h2>
          <div className="mt-10 grid gap-2">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-3xl bg-brand-offwhite px-6 open:pb-6"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 py-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="mr-auto text-lg font-medium">
                    {faq.question}
                  </h3>
                  <Plus className="size-5 shrink-0 transition-transform group-open:rotate-45" />
                </summary>
                <p className="max-w-3xl text-brand-gray">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={cn(SECTION, "py-24")}>
          <div className="relative isolate grid justify-items-center gap-6 overflow-hidden rounded-[40px] bg-black px-6 py-16 text-center text-white">
            <span className="absolute -top-8 -left-8 -z-10 size-28 rounded-full bg-brand-blue" />
            <span className="absolute top-10 right-12 -z-10 size-6 rounded-full bg-brand-orange" />
            <span className="absolute right-24 -bottom-6 -z-10 h-12 w-40 rounded-full bg-brand-cyan" />
            <span className="absolute bottom-12 left-16 -z-10 size-8 rounded-full bg-brand-red" />
            <Mascot size={112} />
            <h2 className={HEADING}>
              Your next comment could be a conversation.
            </h2>
            <Link href="/signup" className={cn(PRIMARY, "h-12 px-7")}>
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-6 pb-12 text-sm text-brand-gray">
        <span className="text-black">
          <Brand />
        </span>
        <p>Instagram comment-to-DM automation.</p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 sm:ml-auto"
        >
          {sections.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-black">
              {item.label}
            </a>
          ))}
          <Link href="/login" className="hover:text-black">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-black">
            Sign up
          </Link>
        </nav>
      </footer>
    </div>
  )
}

/** The DM a commenter receives, with the mascot and a sample comment. */
function HeroArt() {
  return (
    // The phone is 300px wide, so the narrowest screens shrink the whole scene.
    <div className="relative isolate mx-auto w-fit px-5 max-[389px]:[zoom:0.8] sm:px-16">
      <span className="absolute inset-x-0 inset-y-14 -z-10 rounded-[48px] bg-brand-offwhite" />
      <span className="absolute top-20 right-5 -z-10 size-14 bg-[radial-gradient(circle,rgb(0_0_0/0.18)_1.5px,transparent_1.5px)] bg-size-[14px_14px]" />
      <span className="absolute top-6 left-6 -z-10 size-7 rounded-full bg-brand-blue" />
      <span className="absolute right-1 bottom-5 -z-10 h-6 w-14 rounded-full bg-brand-cyan" />
      <InstagramPreview
        screen="dm"
        account={{ username: "studio.maya", picture: null }}
        post={null}
        keyword="GUIDE"
        commentReply={null}
        openingDm={{
          message: "Hey {{first_name}}! Thanks for the comment 💬",
          buttonLabel: "Send me the guide",
        }}
        dmMessage="Here's your free guide ✨"
        buttons={["Download"]}
      />
      <p
        aria-hidden
        className="absolute top-28 left-0 flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-sm shadow-lg ring-1 ring-black/5"
      >
        <span className="grid size-7 place-items-center rounded-full bg-brand-orange text-xs font-bold">
          A
        </span>
        <b>alex</b> GUIDE
      </p>
      <p
        aria-hidden
        className="absolute top-44 right-0 flex items-center gap-2 rounded-full bg-black py-1.5 pr-4 pl-1.5 text-sm font-medium text-white shadow-lg"
      >
        <span className="grid size-7 place-items-center rounded-full bg-brand text-black">
          <Check className="size-4" strokeWidth={3} />
        </span>
        DM sent
      </p>
      <Mascot
        size={168}
        eager
        alt="The aghost mascot, a friendly green ghost"
        className="absolute -bottom-10 -left-4 size-28 drop-shadow-xl sm:-bottom-12 sm:-left-14 sm:size-42"
      />
    </div>
  )
}
