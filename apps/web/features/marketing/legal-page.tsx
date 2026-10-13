import type { ReactNode } from "react"
import Link from "next/link"
import { MarketingPage, card } from "./shell"

export type PolicySection = { id: string; title: string; content: ReactNode }

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string
  intro: ReactNode
  sections: PolicySection[]
}) {
  return (
    <MarketingPage>
      <div className="mx-auto max-w-7xl px-5 pt-16 pb-8 sm:px-8 sm:pt-24">
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          Back to home
        </Link>
        <h1 className="mt-6 text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-white/50">
          Last updated: <time dateTime="2026-10-11">October 11, 2026</time>
        </p>
        <div className="mt-12 grid items-start gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav
            aria-label="On this page"
            className={`${card} p-6! lg:sticky lg:top-28`}
          >
            <h2 className="mb-4 text-sm font-semibold text-white/50">
              On this page
            </h2>
            <ol className="grid gap-3 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="hover:text-brand">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="marketing-prose max-w-3xl">
            <div className="text-lg text-white/85">{intro}</div>
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2>{section.title}</h2>
                <div>{section.content}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </MarketingPage>
  )
}
