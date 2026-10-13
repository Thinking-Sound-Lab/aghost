"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { Mascot } from "@/components/brand"
import { marketingLinks } from "./navigation"

const links = [
  { href: "/", label: "Home" },
  ...marketingLinks.filter((link) => link.href !== "/#faq"),
]

export function MarketingHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  return (
    <header
      className="notebook-toolbar"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false)
          menuButton.current?.focus()
        }
      }}
    >
      <Link
        href="/"
        aria-label="aghost home"
        className="notebook-brand"
        onClick={() => setOpen(false)}
      >
        <Mascot size={25} eager />
        aghost
      </Link>
      <nav aria-label="Main" className="notebook-navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={
              pathname === link.href ||
              (link.href === "/blog" && pathname.startsWith("/blog/"))
                ? "page"
                : undefined
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="notebook-toolbar-end">
        <div className="notebook-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <Link href="/login" className="notebook-toolbar-cta">
          Get started <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
        <button
          ref={menuButton}
          type="button"
          className="notebook-menu-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
      {open && (
        <nav
          id="marketing-mobile-nav"
          aria-label="Mobile"
          className="notebook-mobile-nav"
        >
          {[
            ...links,
            { href: "/contact", label: "Contact" },
            { href: "/#faq", label: "FAQ" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname === link.href ||
                (link.href === "/blog" && pathname.startsWith("/blog/"))
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
