import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronsRight } from "lucide-react"
import { PLANS } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { price } from "@/features/billing/plan-cards"
import { contactHref } from "./contact"
import { Brand, MarketingHeader } from "./header"
import { agentLinks, legalLinks, resourceLinks } from "./navigation"
import "./marketing.css"

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e0e]"

export const primaryButton = cn(
  "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-black transition-colors hover:bg-brand",
  focusRing
)
export const outlineButton = cn(
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white ring-1 ring-white/35 transition-colors hover:bg-white/10",
  focusRing
)
export const textLink =
  "underline decoration-white/35 underline-offset-4 transition-colors hover:decoration-brand"

/** Layout for inner pages: a centred section, a dark card, a block of text. */
export const section = "mx-auto mt-24 max-w-7xl px-5 sm:px-8"
export const card = "rounded-[2rem] bg-[#161616] p-8 ring-1 ring-white/10"
export const prose =
  "grid content-start gap-5 text-lg text-white/70 [&_h2]:text-3xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.03em] [&_h2]:text-white sm:[&_h2]:text-4xl [&_h3]:text-2xl [&_h3]:font-extrabold [&_h3]:tracking-[-0.03em] [&_h3]:text-white"

/** The cheapest plan's monthly price, so every "Start" button says it. */
export const startingPrice = price(PLANS.pro.prices.USD.monthly, "USD")

export function GetStarted({ className }: { className?: string }) {
  return (
    <Link href="/login" className={cn(primaryButton, className)}>
      Start for {startingPrice}/month
      <ChevronsRight aria-hidden="true" className="size-4" />
    </Link>
  )
}

/** A small uppercase label, as at the top of a feature card. */
export function Pill({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase",
        className
      )}
    >
      {children}
    </span>
  )
}

/** Hand-drawn marks around a page's opening headline. */
export function Doodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none max-xl:hidden">
      <svg
        viewBox="0 0 260 190"
        className="absolute top-72 -left-6 w-64 text-white"
      >
        <path
          d="M2 40c64-6 112 18 122 58 9 38-26 64-52 46-28-20 2-68 50-60 48 8 70 46 136 86"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <svg
        viewBox="0 0 100 100"
        className="absolute top-40 right-16 w-20 text-white"
      >
        <path
          d="M50 2c3 31 17 45 48 48-31 3-45 17-48 48-3-31-17-45-48-48 31-3 45-17 48-48Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute top-28 right-48 size-4 rounded-full bg-brand" />
      <span className="absolute top-[30rem] left-40 size-3 rounded-full bg-brand-cyan" />
    </div>
  )
}

/** Two hand-drawn strokes under a word in a heading. */
export function Scribble({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 300 24"
        preserveAspectRatio="none"
        className="absolute -bottom-3 left-0 h-4 w-full text-brand"
      >
        <path
          d="M4 9c70-5 200-7 292-3M40 19c60-6 150-8 210-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function SectionHeading({
  title,
  description,
  id,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <div className={cn("mx-auto max-w-3xl text-center", className)}>
      <h2
        id={id}
        className="text-4xl font-extrabold tracking-[-0.035em] text-balance sm:text-5xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-white/70">
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
      <h2 className="mb-1 text-sm font-semibold text-white/45">{title}</h2>
      {links.map((link) =>
        link.href.startsWith("/api/") ? (
          <a key={link.href} href={link.href} className="hover:text-brand">
            {link.label}
          </a>
        ) : (
          <Link key={link.href} href={link.href} className="hover:text-brand">
            {link.label}
          </Link>
        )
      )}
    </nav>
  )
}

export function MarketingFooter() {
  return (
    <footer className="mx-auto max-w-7xl px-5 pt-20 pb-10 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div className="grid content-start gap-4">
          <Brand />
          <p className="max-w-xs text-white/60">
            Agentic DM automation for Instagram. Comments in, links out.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-[15px] sm:grid-cols-4">
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
      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50">
        <p>© 2026 aghost. All rights reserved.</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

/** The dark canvas every public page sits on. `dark` switches the UI tokens. */
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
        "marketing dark min-h-svh overflow-x-clip bg-[#0e0e0e] text-white antialiased",
        className
      )}
    >
      {children}
    </div>
  )
}

export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <MarketingCanvas>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full bg-white px-4 py-2 text-black focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </MarketingCanvas>
  )
}

/** The opening of an inner page: where it sits, what it is, one line on why. */
export function PageIntro({
  title,
  description,
  category,
}: {
  title: string
  description: string
  category: string
}) {
  return (
    <div className="mx-auto max-w-4xl px-5 pt-16 pb-14 text-center sm:px-8 sm:pt-24">
      <nav
        aria-label="Breadcrumb"
        className="flex justify-center gap-2 text-sm text-white/50"
      >
        <Link href="/" className="hover:text-white">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-white/80">
          {category}
        </span>
      </nav>
      <h1 className="mt-6 text-5xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-white/70 sm:text-xl">
        {description}
      </p>
    </div>
  )
}

/** A wide brand-green band that asks for the sign-up mid-page. */
export function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-8 rounded-[2rem] bg-linear-to-br from-brand to-brand-cyan px-8 py-12 text-black sm:px-14 md:flex-row md:items-center">
        <div className="max-w-xl">
          <h2 className="text-4xl font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">
            Stop sending the same DM by hand
          </h2>
          <p className="mt-4 text-lg text-black/75">
            Connect Instagram and send your first automated DM in minutes. Every
            plan includes MCP and REST API access for your agent.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black px-7 py-3.5 text-[15px] font-semibold text-white transition-colors outline-none hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
        >
          Start for {startingPrice}/month
          <ChevronsRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  )
}

/** The closing panel of every page, with the mascot's orbs along its floor. */
export function MarketingCta() {
  return (
    <section className="mx-auto mt-28 max-w-7xl px-5 sm:px-8">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1b1b1b] px-6 pt-20 pb-44 text-center sm:pb-52">
        <h2 className="text-5xl font-extrabold tracking-[-0.04em] text-balance sm:text-6xl">
          Ready to get started?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
          Every comment that asks for the link gets it, while you get back to
          creating.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <GetStarted />
          <a href={contactHref()} className={outlineButton}>
            Talk to us
          </a>
        </div>
        <div aria-hidden="true">
          <span className="absolute -bottom-10 left-[8%] size-36 rounded-full bg-brand" />
          <span className="absolute bottom-6 left-[30%] h-16 w-40 -rotate-12 rounded-full bg-brand-blue" />
          <span className="absolute -bottom-6 left-[47%] size-24 rounded-full bg-brand-orange" />
          <span className="absolute bottom-10 left-[62%] h-14 w-32 rotate-12 rounded-full bg-brand-cyan" />
          <span className="absolute -bottom-12 left-[80%] size-40 rounded-full bg-brand-red" />
          <span className="absolute bottom-24 left-[20%] size-5 rounded-full bg-brand-cyan max-sm:hidden" />
          <span className="absolute bottom-28 left-[75%] size-4 rounded-full bg-brand max-sm:hidden" />
        </div>
      </div>
    </section>
  )
}
