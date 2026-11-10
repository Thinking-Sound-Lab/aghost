import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { Instrument_Sans, Source_Serif_4 } from "next/font/google"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Monogram, ghostPath } from "@/components/brand"
import { contactHref } from "./contact"
import { Brand, MarketingHeader } from "./header"
import {
  agentLinks,
  compareLinks,
  legalLinks,
  resourceLinks,
  startTrial,
} from "./navigation"
import "./marketing.css"

// Headlines are set in Instrument Sans and subtitles and accents in a serif.
// Only the public site loads them; its text and controls stay in Inter.
const display = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
})
const serif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
})

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"

export const primaryButton = cn(
  "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-ink px-6 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(18_20_22/0.2)] transition-colors hover:bg-ink/85",
  focusRing
)
/** The warm, glossy button for the one action a section asks for. */
export const accentButton = cn(
  "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(180deg,#fff4e6_0%,#ffddb4_52%,#fdc489_100%)] px-6 text-[15px] font-medium text-ink shadow-[inset_0_0_0_1px_rgb(214_116_36/0.7),inset_0_2px_3px_-1px_rgb(255_255_255/0.8),inset_0_-1px_1px_rgb(194_104_30/0.22),0_1px_2px_rgb(194_104_30/0.22),0_10px_24px_-10px_rgb(245_150_70/0.6)] transition-[filter] [text-shadow:0_1px_0_rgb(255_255_255/0.45)] hover:brightness-[1.03]",
  focusRing
)
export const outlineButton = cn(
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#d3dce6] bg-white px-6 text-[15px] text-ink transition-colors hover:bg-[#edf1f6]",
  focusRing
)
export const textLink =
  "text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"

/** Layout for inner pages: a section, a white panel, a block of text. */
export const section = "mx-auto mt-24 max-w-7xl px-5 sm:px-8 lg:px-12"
export const card =
  "rounded-[24px] bg-white p-8 shadow-[0_0_0_1px_rgb(18_20_22/0.06),0_1px_2px_rgb(18_20_22/0.03),0_30px_60px_-40px_rgb(17_24_39/0.25)]"
export const prose =
  "grid content-start gap-5 text-lg text-ink/70 [&_h2]:text-3xl [&_h2]:font-normal [&_h2]:tracking-[-0.03em] [&_h2]:text-ink sm:[&_h2]:text-4xl [&_h3]:text-2xl [&_h3]:font-normal [&_h3]:tracking-[-0.025em] [&_h3]:text-ink"

export function GetStarted({
  className,
  href = "/login",
  children = startTrial,
}: {
  className?: string
  /** Where sign-up leads, such as billing with a plan already chosen. */
  href?: string
  children?: ReactNode
}) {
  return (
    <Link href={href} className={cn(accentButton, className)}>
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  )
}

/** A section's colour, used by its badge, highlights, tabs and icons. */
export type Tone = "blue" | "violet" | "orange" | "green" | "cyan" | "slate"

/** A small white badge above a heading, with a coloured icon. */
export function Pill({
  children,
  tone = "slate",
  icon: Icon,
  className,
}: {
  children: ReactNode
  tone?: Tone
  icon?: LucideIcon
  className?: string
}) {
  return (
    <span
      className={cn(
        `tone-${tone}`,
        "inline-flex w-fit items-center gap-2 rounded-full bg-white py-1 pr-3.5 pl-1 text-sm font-medium tracking-[-0.01em] text-(--tone-ink) shadow-[0_0_0_1px_var(--tone-ring),0_8px_20px_-12px_var(--tone-glow)]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-6 place-items-center rounded-full bg-linear-160 from-(--tone-from) to-(--tone-to) text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-1px_0_rgb(0_0_0/0.12)]"
      >
        {Icon ? <Icon className="size-3" /> : <Monogram className="size-3.5" />}
      </span>
      {children}
    </span>
  )
}

/** Words in a subtitle picked out in the section's colour. */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="font-normal text-(--tone-ink)">{children}</span>
}

/** The monogram as a little white ghost with dark eyes and pink cheeks. */
export function Ghost({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={style}
      className={cn(
        "shrink-0 drop-shadow-[0_12px_14px_rgb(70_56_120/0.22)]",
        className
      )}
    >
      <rect x="10" y="29" width="47" height="31" rx="12" fill="#121416" />
      <path fill="#fff" fillRule="evenodd" d={ghostPath} />
      <ellipse cx="19" cy="64" rx="4.5" ry="2.6" fill="#f7a9bd" />
      <ellipse cx="50" cy="62" rx="4.5" ry="2.6" fill="#f7a9bd" />
    </svg>
  )
}

/** A painted landscape behind its children, in one of the site's lights. */
export function Painting({
  tone,
  className,
  children,
}: {
  tone: "sky" | "dusk" | "mist" | "gold"
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn("painting rounded-[20px]", `painting-${tone}`, className)}
    >
      <div aria-hidden="true" className="painting-layer" />
      {children}
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  eyebrow,
  tone = "slate",
  icon,
  id,
  align = "center",
  className,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: string
  tone?: Tone
  icon?: LucideIcon
  id?: string
  align?: "center" | "left"
  className?: string
}) {
  return (
    <div
      className={cn(
        `tone-${tone}`,
        "grid gap-5",
        align === "center"
          ? "mx-auto max-w-3xl justify-items-center text-center"
          : "max-w-3xl",
        className
      )}
    >
      {eyebrow && (
        <Pill tone={tone} icon={icon} className="mb-1">
          {eyebrow}
        </Pill>
      )}
      <h2
        id={id}
        className="text-[clamp(2.125rem,4.6vw,3.375rem)] leading-[1.02] font-normal tracking-[-0.03em] text-balance"
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-[38rem] font-serif text-[17px] leading-[1.55] font-light tracking-[-0.01em] text-balance text-ink/65 sm:text-lg">
          {description}
        </p>
      )}
    </div>
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
      <p className="mb-1 font-display text-lg font-medium tracking-[-0.01em] text-ink">
        {title}
      </p>
      {links.map((link) =>
        link.href.startsWith("/api/") ? (
          <a
            key={link.href}
            href={link.href}
            className="text-ink/70 transition-colors hover:text-ink"
          >
            {link.label}
          </a>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            className="text-ink/70 transition-colors hover:text-ink"
          >
            {link.label}
          </Link>
        )
      )}
    </nav>
  )
}

function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden">
      <Monogram className="pointer-events-none absolute top-24 left-1/2 size-[64rem] -translate-x-1/2 text-ink/[0.03]" />
      <div className="relative mx-auto max-w-[88rem] px-5 pt-20 pb-10 sm:px-8 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_3fr]">
          <div className="grid content-start gap-5">
            <Brand />
            <p className="max-w-xs text-[15px] leading-6 text-ink/70">
              aghost is social media scheduling for seven platforms and
              Instagram comment-to-DM automation, run from your dashboard or
              your AI agent.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-[15px] sm:grid-cols-3 xl:grid-cols-5">
            <FooterLinks
              title="Product"
              links={[
                { href: "/features", label: "Features" },
                { href: "/#how-it-works", label: "How it works" },
                { href: "/pricing", label: "Pricing" },
                { href: "/#faq", label: "FAQ" },
              ]}
            />
            <FooterLinks title="AI agents" links={agentLinks} />
            <FooterLinks title="Resources" links={resourceLinks} />
            <FooterLinks title="Compare" links={compareLinks} />
            <FooterLinks
              title="Company"
              links={[
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/login", label: "Log in or sign up" },
              ]}
            />
          </div>
        </div>
        <div className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-8 text-sm text-ink/65">
          <p>© 2026 aghost. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}

/** The light canvas every public page sits on. */
export function MarketingCanvas({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "marketing min-h-svh overflow-x-clip bg-canvas text-ink antialiased",
        display.variable,
        serif.variable,
        className
      )}
    >
      {children}
    </div>
  )
}

/** A pale sheet on a grey frame, with the header over it and the footer below. */
export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <MarketingCanvas className="bg-frame">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-[10px] bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <div className="rounded-b-[32px] bg-canvas pt-[4.75rem] pb-28 shadow-[0_1px_0_rgb(18_20_22/0.05)]">
        <main id="main-content">{children}</main>
      </div>
      <MarketingFooter />
    </MarketingCanvas>
  )
}

/** The opening of an inner page: where it sits, what it is, one line on why. */
export function PageIntro({
  title,
  description,
  category,
  parent,
}: {
  title: string
  description: string
  category: string
  /** A page between Home and this one in the breadcrumb. */
  parent?: { href: string; label: string }
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-16 pb-14 sm:px-8 sm:pt-24 lg:px-12">
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-ink/65">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        {parent && (
          <>
            <Link href={parent.href} className="hover:text-ink">
              {parent.label}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page" className="text-ink/80">
          {category}
        </span>
      </nav>
      <h1 className="mt-6 max-w-4xl text-[clamp(2.75rem,6vw,4.75rem)] leading-[1] font-normal tracking-[-0.035em] text-balance">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl font-serif text-lg leading-[1.55] font-light text-pretty text-ink/65 sm:text-xl">
        {description}
      </p>
    </div>
  )
}

/** The closing call of every page, under a floating ghost. */
export function MarketingCta({
  title = "Your audience is everywhere. Be there with one post.",
  description = "Seven platforms. Every comment answered. One workspace.",
}: {
  title?: string
  description?: string
}) {
  return (
    <section className="mx-auto mt-36 grid max-w-5xl justify-items-center px-5 text-center sm:px-8">
      <Ghost
        className="ghost-float size-20"
        style={{ "--tilt": "-4deg" } as CSSProperties}
      />
      <h2 className="mt-10 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] font-normal tracking-[-0.035em] text-balance">
        {title}
      </h2>
      <p className="mt-6 max-w-xl font-serif text-lg leading-[1.55] font-light text-ink/65">
        {description}
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <GetStarted />
        <a href={contactHref()} className={outlineButton}>
          Talk to us
        </a>
      </div>
    </section>
  )
}
