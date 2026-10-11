import type { ReactNode } from "react"
import Link from "next/link"
import { MarketingPage, marketingLink } from "./shell"

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
      <div className="notebook-section notebook-policy">
        <Link href="/" className={`${marketingLink} text-xs`}>
          Back to home
        </Link>
        <h1 className="notebook-title">{title}</h1>
        <p className="notebook-policy-date">
          Last updated: <time dateTime="2026-10-11">October 11, 2026</time>
        </p>
        <div className="notebook-policy-layout">
          <nav aria-label="On this page" className="notebook-policy-toc">
            <h2>On this page</h2>
            <ol>
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="notebook-policy-copy">
            <div>{intro}</div>
            <div>
              {sections.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2>{section.title}</h2>
                  <div>{section.content}</div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MarketingPage>
  )
}
