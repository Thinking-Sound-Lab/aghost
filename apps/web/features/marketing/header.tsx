"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsRight, Menu, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Mascot } from "@/components/brand"
import { marketingLinks } from "./navigation"

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      aria-label="aghost home"
      onClick={onClick}
      className="flex items-center gap-2 text-xl font-extrabold tracking-tight"
    >
      <Mascot size={30} eager />
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

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap sm:px-5 sm:text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand"

export function MarketingHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  return (
    <header
      className="sticky top-0 z-40 bg-[#0e0e0e]/85 backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false)
          menuButton.current?.focus()
        }
      }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8">
        <Brand onClick={() => setOpen(false)} />
        <nav
          aria-label="Main"
          className="mx-auto hidden items-center gap-9 text-[15px] font-medium lg:flex"
        >
          {marketingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
              className="text-white/85 transition-colors hover:text-white aria-[current=page]:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href="/login"
            className={cn(
              pill,
              "text-white ring-1 ring-white/35 hover:bg-white/10 max-sm:hidden"
            )}
          >
            Log in
          </Link>
          <Link
            href="/login"
            className={cn(pill, "bg-white text-black hover:bg-brand")}
          >
            Get started
            <ChevronsRight
              aria-hidden="true"
              className="size-4 max-[400px]:hidden"
            />
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="grid size-10 place-items-center rounded-full ring-1 ring-white/35 lg:hidden"
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
          className="grid gap-1 border-t border-white/10 px-5 py-4 text-lg font-semibold lg:hidden"
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
              className="rounded-xl px-3 py-2.5 hover:bg-white/10 aria-[current=page]:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
