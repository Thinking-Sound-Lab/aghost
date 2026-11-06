"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Monogram } from "@/components/brand"
import { marketingLinks, startTrial } from "./navigation"

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      aria-label="aghost home"
      onClick={onClick}
      className="flex items-center gap-2 rounded-[10px] text-[22px] font-medium tracking-[-0.03em] text-ink"
    >
      <Monogram className="size-8" />
      aghost
    </Link>
  )
}

/** The blog's link stays current on its articles too. */
function isCurrent(pathname: string, href: string) {
  return (
    pathname === href || (href === "/blog" && pathname.startsWith("/blog/"))
  )
}

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"

export function MarketingHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-40 px-2 sm:px-4 lg:px-8"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false)
          menuButton.current?.focus()
        }
      }}
    >
      <div className="header-bar pointer-events-auto mx-auto mt-3 flex h-16 max-w-6xl items-center gap-3 rounded-[18px] bg-white/85 px-3 shadow-[0_0_0_1px_rgb(18_20_22/0.07),0_12px_32px_-18px_rgb(17_24_39/0.3)] backdrop-blur-md sm:gap-6 sm:px-5 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        {/* Equal side columns keep the menu centred on the page. */}
        <div className="lg:justify-self-start">
          <Brand onClick={() => setOpen(false)} />
        </div>
        <nav
          aria-label="Main"
          className="mx-auto hidden items-center gap-7 text-[15px] lg:flex"
        >
          {marketingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
              className="text-ink/75 transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:underline-offset-8"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:justify-self-end">
          <Link
            href="/login"
            className={cn(
              "inline-flex h-10 items-center rounded-[10px] border border-ink/80 px-4 text-[15px] transition-colors hover:bg-ink/5 max-sm:hidden",
              focus
            )}
          >
            Log in
          </Link>
          <Link
            href="/login"
            className={cn(
              "inline-flex h-10 items-center rounded-[10px] bg-ink px-4 text-[15px] font-medium whitespace-nowrap text-white transition-colors hover:bg-ink/85",
              focus
            )}
          >
            {/* The full label leaves no room for the menu button on phones. */}
            <span className="sm:hidden">Start for $0</span>
            <span className="max-sm:hidden">{startTrial}</span>
          </Link>
          <button
            ref={menuButton}
            type="button"
            className={cn(
              "grid size-10 place-items-center rounded-[10px] border border-ink/15 lg:hidden",
              focus
            )}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="marketing-mobile-nav"
          aria-label="Mobile"
          className="pointer-events-auto mx-auto mt-2 grid max-w-6xl gap-1 rounded-[18px] bg-white p-3 text-lg shadow-[0_0_0_1px_rgb(18_20_22/0.07),0_20px_40px_-20px_rgb(17_24_39/0.35)] lg:hidden"
        >
          {[
            { href: "/", label: "Home" },
            ...marketingLinks,
            { href: "/contact", label: "Contact" },
            { href: "/login", label: "Log in" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="rounded-[10px] px-3 py-2.5 hover:bg-ink/5 aria-[current=page]:font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
