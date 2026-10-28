"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Monogram } from "@/components/brand"
import { marketingLinks } from "./navigation"

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      aria-label="aghost home"
      onClick={onClick}
      className="flex items-center gap-2 text-[22px] font-medium tracking-[-0.03em] text-ink"
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
      className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false)
          menuButton.current?.focus()
        }
      }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8 lg:px-12">
        <Brand onClick={() => setOpen(false)} />
        <nav
          aria-label="Main"
          className="mx-auto hidden items-center gap-8 text-[15px] lg:flex"
        >
          {marketingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
              className="text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:underline-offset-8"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <Link
            href="/login"
            className={cn(
              "text-[17px] text-[#2a5a87] hover:underline max-sm:hidden",
              focus
            )}
          >
            Log in
          </Link>
          <Link
            href="/login"
            className={cn(
              "inline-flex h-11 items-center bg-ink px-4 text-[15px] font-medium whitespace-nowrap text-white transition-colors hover:bg-ink/85",
              focus
            )}
          >
            Get started
          </Link>
          <button
            ref={menuButton}
            type="button"
            className={cn(
              "grid size-11 place-items-center border border-ink/20 lg:hidden",
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
          className="grid gap-1 border-t border-ink/10 px-5 py-4 text-lg lg:hidden"
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
              className="px-3 py-2.5 hover:bg-ink/5 aria-[current=page]:font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
