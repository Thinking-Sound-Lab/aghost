import Link from "next/link"
import { ArrowRight, Check, Plus } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Brand, Mascot } from "@/components/brand"
import { faqs, facts, features, steps } from "./content"
import { Demo } from "./demo"
import {
  featureScenes,
  InboxScene,
  SafetyScene,
  Scene,
  StatsScene,
  stepScenes,
} from "./illustrations"

const PILL =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
const PRIMARY = cn(PILL, "bg-brand text-black hover:bg-brand/80")
const DARK = cn(PILL, "bg-black text-white hover:bg-black/80")

const SECTION = "mx-auto max-w-6xl scroll-mt-6 px-6"
const EYEBROW =
  "text-xs font-semibold tracking-[0.16em] text-brand-gray uppercase"
const DISPLAY =
  "text-[2.6rem] leading-[1.12] font-extrabold tracking-[-0.045em] text-balance sm:text-6xl"
// The second line of a headline sits on a green marker. Black on green reads;
// green text on white would not.
const MARKER = "box-decoration-clone rounded-2xl bg-brand px-3"
const LEAD = "text-lg text-brand-gray"

// Light tints of the palette, in the order the cards use them.
const TINTS = [
  "bg-brand-orange/25",
  "bg-brand-blue/12",
  "bg-brand-red/12",
  "bg-brand/20",
  "bg-brand-cyan/20",
  "bg-brand-orange/15",
]

const sections = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
]

function Headline({
  as: Tag = "h2",
  lead,
  accent,
  className,
}: {
  as?: "h1" | "h2"
  lead: string
  accent: string
  className?: string
}) {
  return (
    <Tag className={cn(DISPLAY, className)}>
      {lead}{" "}
      <span className="mt-1 block">
        <span className={MARKER}>{accent}</span>
      </span>
    </Tag>
  )
}

function GetStarted({ className }: { className?: string }) {
  return (
    <Link href="/login" className={cn(PRIMARY, "h-12 px-7", className)}>
      Get started
      <ArrowRight className="size-4" />
    </Link>
  )
}

export function Landing() {
  return (
    <div className="overflow-x-clip bg-white text-black">
      <header className="mx-auto grid h-20 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-6 md:grid-cols-[1fr_auto_1fr]">
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
        <div className="flex items-center justify-end gap-5">
          <Link
            href="/login"
            className="hidden text-[15px] font-medium hover:text-brand-gray sm:block"
          >
            Log in
          </Link>
          <Link href="/login" className={cn(DARK, "h-10 px-5 text-sm")}>
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl justify-items-center gap-6 px-6 pt-14 pb-20 text-center sm:pt-20">
          <Mascot size={96} eager className="drop-shadow-xl" />
          <p className={EYEBROW}>Instagram DM automation</p>
          <Headline
            as="h1"
            lead="Turn Instagram comments"
            accent="into DMs, automatically."
            className="sm:text-7xl"
          />
          <p className={cn(LEAD, "max-w-2xl sm:text-xl")}>
            aghost replies to every comment that has your keyword and sends the
            commenter your link by DM. Set it up once, and it runs while you
            sleep.
          </p>
          <GetStarted />
          <p className="text-sm text-brand-gray">
            Instagram professional account required · You never share your
            password
          </p>
        </section>

        <Demo cta={<GetStarted className="w-full" />} />

        <section aria-label="aghost in numbers" className="bg-brand/10">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-6 py-12 md:grid-cols-4 md:divide-x md:divide-black/10">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="grid justify-items-center gap-1 text-center"
              >
                <dt className="order-2 text-brand-gray">{fact.label}</dt>
                <dd className="order-1 text-5xl font-extrabold tracking-[-0.04em]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="how-it-works" className={cn(SECTION, "py-24")}>
          <div className="grid justify-items-center gap-5 text-center">
            <p className={EYEBROW}>How it works</p>
            <Headline lead="Set up in minutes." accent="Three steps." />
          </div>
          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className={cn(
                  "grid content-start gap-4 rounded-3xl border-2 border-black p-3 pb-6",
                  TINTS[index]
                )}
              >
                <Scene className="rounded-2xl border-2 border-black bg-white/70">
                  {stepScenes[index]}
                </Scene>
                <div className="grid gap-2 px-3">
                  <span className="w-fit rounded-full bg-black px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-white">
                    STEP {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-brand-gray">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="features"
          className="scroll-mt-6 bg-brand-offwhite px-6 py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid justify-items-center gap-5 text-center">
              <p className={EYEBROW}>Everything you need</p>
              <Headline
                lead="Built for the whole"
                accent="comment-to-DM funnel."
              />
              <p className={cn(LEAD, "max-w-xl")}>
                From the first comment to the link click: automated, tracked,
                and in one dashboard.
              </p>
            </div>
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <li
                  key={feature.title}
                  className="overflow-hidden rounded-3xl border border-black bg-white"
                >
                  <Scene className={cn("border-b border-black", TINTS[index])}>
                    {featureScenes[index]}
                  </Scene>
                  <div className="grid gap-1.5 p-5">
                    <p className={EYEBROW}>{feature.label}</p>
                    <h3 className="text-lg font-bold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-brand-gray">{feature.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Story
          eyebrow="Stats · built in"
          lead="Know which DM"
          accent="got the click."
          text="Every automation counts its comments, DMs sent, and link clicks. There is nothing to set up."
          points={[
            "Comments, DMs sent, and link clicks per automation",
            "A log of every DM: sent, waiting for a tap, or failed",
            "Compare automations to see which one works",
          ]}
          scene={<StatsScene />}
        />
        <Story
          eyebrow="Inbox"
          lead="Every conversation."
          accent="One inbox."
          text="When people reply, answer them from aghost. Your Instagram contacts are there too."
          points={[
            "Reply to DMs without switching apps",
            "Your Instagram contacts in one list",
            "Search conversations and contacts",
          ]}
          scene={<InboxScene />}
          flip
        />
        <Story
          eyebrow="Account safety"
          lead="Safe by"
          accent="design."
          text="aghost follows Instagram's rules for automated messages on every send."
          points={[
            "Connect through Instagram's own login",
            "Your password is never shared with aghost",
            "Only professional accounts, as Instagram requires",
          ]}
          scene={<SafetyScene />}
        />

        <section id="faq" className={cn(SECTION, "max-w-3xl py-24")}>
          <div className="grid justify-items-center gap-5 text-center">
            <p className={EYEBROW}>FAQ</p>
            <Headline lead="Common questions," accent="straight answers." />
          </div>
          <div className="mt-12 divide-y divide-black/10 border-y border-black/10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="mr-auto text-lg font-semibold">
                    {faq.question}
                  </h3>
                  <Plus className="size-5 shrink-0 text-brand-gray transition-transform group-open:rotate-45" />
                </summary>
                <p className="pb-6 text-brand-gray">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={cn(SECTION, "pb-16")}>
          <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-black px-8 py-16 text-white sm:px-14">
            <h2 className="text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-6xl">
              Reply to every comment. <br />
              Send every link. <br />
              <span className="text-brand">Even while you sleep.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-white/70">
              Set up your first automation in three steps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GetStarted />
              <a
                href="#how-it-works"
                className={cn(
                  PILL,
                  "h-12 px-7 text-white ring-1 ring-white/30 hover:bg-white/10"
                )}
              >
                How it works
              </a>
            </div>
            <Mascot
              size={220}
              className="absolute -right-6 -bottom-10 -z-10 max-md:hidden lg:right-10"
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto grid max-w-6xl gap-10 px-6 pb-14 text-sm sm:grid-cols-[1fr_auto_auto] sm:gap-16">
        <div className="grid content-start gap-3">
          <Brand />
          <p className="max-w-xs text-brand-gray">
            Instagram comment-to-DM automation.
          </p>
        </div>
        <FooterLinks title="Product" links={sections} />
        <FooterLinks
          title="Account"
          links={[{ href: "/login", label: "Log in or sign up" }]}
        />
      </footer>
    </div>
  )
}

/** A feature told at length: text on one side, its picture on the other. */
function Story({
  eyebrow,
  lead,
  accent,
  text,
  points,
  scene,
  flip = false,
}: {
  eyebrow: string
  lead: string
  accent: string
  text: string
  points: string[]
  scene: React.ReactNode
  flip?: boolean
}) {
  return (
    <section
      className={cn(
        SECTION,
        "grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-20 md:grid-cols-2 md:gap-16"
      )}
    >
      <div className={cn("grid content-start gap-5", flip && "md:order-2")}>
        <p className={EYEBROW}>{eyebrow}</p>
        <Headline lead={lead} accent={accent} className="sm:text-5xl" />
        <p className={LEAD}>{text}</p>
        <ul className="grid gap-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-black text-brand">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      {scene}
    </section>
  )
}

function FooterLinks({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string }[]
}) {
  return (
    <nav aria-label={title} className="grid content-start gap-3">
      <p className="font-semibold">{title}</p>
      {links.map((link) =>
        link.href.startsWith("#") ? (
          <a
            key={link.href}
            href={link.href}
            className="text-brand-gray hover:text-black"
          >
            {link.label}
          </a>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            className="text-brand-gray hover:text-black"
          >
            {link.label}
          </Link>
        )
      )}
    </nav>
  )
}
