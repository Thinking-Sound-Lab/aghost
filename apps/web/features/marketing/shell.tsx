import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PLANS } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { price } from "@/features/billing/plan-cards"
import { contactHref } from "./contact"
import { Brand, MarketingHeader } from "./header"
import { agentLinks, legalLinks, resourceLinks } from "./navigation"
import "./marketing.css"

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"

export const primaryButton = cn(
  "inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-ink/85",
  focusRing
)
export const outlineButton = cn(
  "inline-flex h-12 items-center justify-center gap-2 border border-ink/20 bg-white/50 px-6 text-[15px] font-medium text-ink transition-colors hover:border-ink/40 hover:bg-white",
  focusRing
)
export const textLink =
  "text-[#2a5a87] underline decoration-[#2a5a87]/30 underline-offset-4 transition-colors hover:decoration-[#2a5a87]"

/** Layout for inner pages: a section, a bordered panel, a block of text. */
export const section = "mx-auto mt-24 max-w-7xl px-5 sm:px-8 lg:px-12"
export const card = "border border-ink/10 bg-white/55 p-8"
export const prose =
  "grid content-start gap-5 text-lg text-ink/70 [&_h2]:text-3xl [&_h2]:font-medium [&_h2]:tracking-[-0.035em] [&_h2]:text-ink sm:[&_h2]:text-4xl [&_h3]:text-2xl [&_h3]:font-medium [&_h3]:tracking-[-0.03em] [&_h3]:text-ink"

/** The cheapest plan's monthly price, quoted next to sign-up buttons. */
export const startingPrice = price(PLANS.pro.prices.USD.monthly, "USD")

export function GetStarted({
  className,
  children = "Get started",
}: {
  className?: string
  children?: ReactNode
}) {
  return (
    <Link href="/login" className={cn(primaryButton, className)}>
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  )
}

/** A small uppercase label with a square bullet, above a heading. */
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
        "inline-flex w-fit items-center gap-2.5 text-xs font-medium tracking-[0.14em] text-ink/60 uppercase",
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 bg-current" />
      {children}
    </span>
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
    <div className={cn("painting", `painting-${tone}`, className)}>
      <div aria-hidden="true" className="painting-layer" />
      {children}
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  eyebrow,
  id,
  align = "center",
  className,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: string
  id?: string
  align?: "center" | "left"
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-5",
        align === "center"
          ? "mx-auto max-w-3xl justify-items-center text-center"
          : "max-w-3xl",
        className
      )}
    >
      {eyebrow && <Pill>{eyebrow}</Pill>}
      <h2
        id={id}
        className="text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04] font-medium tracking-[-0.045em] text-balance"
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-lg text-pretty text-ink/65 sm:text-xl">
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
      <h2 className="mb-1 text-xs font-medium tracking-[0.14em] text-ink/50 uppercase">
        {title}
      </h2>
      {links.map((link) =>
        link.href.startsWith("/api/") ? (
          <a
            key={link.href}
            href={link.href}
            className="text-ink/75 hover:text-ink"
          >
            {link.label}
          </a>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            className="text-ink/75 hover:text-ink"
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
    <footer className="mx-auto mt-28 max-w-7xl px-5 pb-10 sm:px-8 lg:px-12">
      <div className="grid gap-12 border-t border-ink/10 pt-14 lg:grid-cols-[1fr_2fr]">
        <div className="grid content-start gap-4">
          <Brand />
          <p className="max-w-xs text-ink/60">
            Post everywhere. Answer every comment.
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
      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-8 text-sm text-ink/50">
        <p>© 2026 aghost. All rights reserved.</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
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
        className="sr-only z-50 bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
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
    <div className="mx-auto max-w-7xl px-5 pt-16 pb-14 sm:px-8 sm:pt-24 lg:px-12">
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-ink/50">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ink/80">
          {category}
        </span>
      </nav>
      <h1 className="mt-6 max-w-4xl text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.02] font-medium tracking-[-0.05em] text-balance">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-pretty text-ink/65 sm:text-xl">
        {description}
      </p>
    </div>
  )
}

/** The closing panel of every page, on a pale painted sky. */
export function MarketingCta({
  title = "Your audience is everywhere. Be there with one post.",
  description = "Six platforms. Every comment answered. One workspace.",
  eyebrow = "One place for every post",
}: {
  title?: string
  description?: string
  eyebrow?: string
}) {
  return (
    <section className="mx-auto mt-28 max-w-7xl px-5 sm:px-8 lg:px-12">
      <Painting
        tone="mist"
        className="grid justify-items-center gap-6 border border-ink/10 px-6 py-24 text-center sm:py-32"
      >
        <Pill>{eyebrow}</Pill>
        <h2 className="max-w-4xl text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[1.02] font-medium tracking-[-0.05em] text-balance">
          {title}
        </h2>
        <p className="max-w-xl text-lg text-ink/65">{description}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <GetStarted />
          <a href={contactHref()} className={outlineButton}>
            Talk to us
          </a>
        </div>
      </Painting>
    </section>
  )
}
