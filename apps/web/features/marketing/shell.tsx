import type { ReactNode } from "react"
import Link from "next/link"
import { Anton, Caveat } from "next/font/google"
import { ArrowUpRight } from "lucide-react"
import { Mascot } from "@/components/brand"
import { contactHref } from "./contact"
import { MarketingHeader } from "./header"
import { agentLinks, legalLinks, resourceLinks } from "./navigation"
import "./notebook.css"

const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-notebook-display",
  display: "swap",
})
const handwriting = Caveat({
  weight: "600",
  subsets: ["latin"],
  variable: "--font-notebook-hand",
  display: "swap",
})

export const marketingButton = "notebook-button"
export const marketingLink = "notebook-link"

export function NotebookBrand() {
  return (
    <Link href="/" aria-label="aghost home" className="notebook-brand">
      <Mascot size={25} eager />
      aghost
    </Link>
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
    <nav aria-label={title}>
      <h2>{title}</h2>
      {links.map((link) =>
        link.href.startsWith("/api/") ? (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ) : (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        )
      )}
    </nav>
  )
}

export function MarketingFooter() {
  return (
    <footer className="notebook-footer">
      <div className="notebook-footer-grid">
        <div className="notebook-footer-brand">
          <NotebookBrand />
          <p>
            Instagram comments into conversations. Built for creators, and the
            agents who help them.
          </p>
          <p className="notebook-hand" style={{ fontSize: 24 }}>
            Your audience. Your rules.
          </p>
        </div>
        <div className="notebook-footer-links">
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
              { href: "/about", label: "About aghost" },
              { href: "/contact", label: "Contact" },
              { href: "/login", label: "Log in or sign up" },
            ]}
          />
        </div>
      </div>
      <div className="notebook-footer-bottom">
        <p>© 2026 aghost. Made for the conversation.</p>
        <nav aria-label="Legal">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className={marketingLink}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div
      className={`marketing-notebook ${display.variable} ${handwriting.variable}`}
    >
      <a href="#main-content" className="notebook-skip">
        Skip to content
      </a>
      <div className="notebook-page">
        <MarketingHeader />
        <main id="main-content">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  )
}

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
    <div className="notebook-section notebook-page-intro">
      <nav aria-label="Breadcrumb" className="notebook-breadcrumbs">
        <Link href="/" className={marketingLink}>
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{category}</span>
      </nav>
      <span className="notebook-sticker">{category}</span>
      <h1 className="notebook-title">{title}</h1>
      <p>{description}</p>
    </div>
  )
}

export function Smiley() {
  return (
    <svg viewBox="0 0 90 90" className="notebook-smiley" aria-hidden="true">
      <path
        d="M45 3C68 2 86 20 86 44c0 24-18 42-42 43C21 87 3 68 3 45 2 21 21 3 45 3Z"
        fill="#f3cd52"
        stroke="#191916"
        strokeWidth="2"
      />
      <path
        d="M30 28v13m28-13v13"
        stroke="#191916"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M25 54c8 17 32 18 41-1"
        fill="none"
        stroke="#191916"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MarketingCta() {
  return (
    <section className="notebook-cta">
      <span className="notebook-sticker notebook-sticker-mint notebook-cta-sticker">
        Less busywork
      </span>
      <span className="notebook-sticker notebook-sticker-lilac notebook-cta-sticker notebook-cta-sticker-right">
        More conversations
      </span>
      <Smiley />
      <h2 className="notebook-title">Let’s get those DMs.</h2>
      <p className="notebook-hand">
        You create. Your little ghost takes it from here.
      </p>
      <Link href="/login" className={marketingButton}>
        <span className="notebook-button-icon">
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </span>
        Get started with aghost
      </Link>
      <p>
        Have a question?{" "}
        <a href={contactHref()} className={marketingLink}>
          Let’s talk.
        </a>
      </p>
    </section>
  )
}
