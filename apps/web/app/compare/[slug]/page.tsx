import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { CompareTable } from "@/features/marketing/compare-table"
import {
  aghostGlance,
  checkedOn,
  comparisonPath,
  comparisons,
  getComparison,
  glanceLabels,
} from "@/features/marketing/comparisons"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  card,
  prose,
  section,
  textLink,
} from "@/features/marketing/shell"
import { jsonLd } from "@/features/marketing/structured-data"
import { openGraph, site } from "@/lib/site"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return comparisons.map((comparison) => ({ slug: comparison.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const comparison = getComparison((await params).slug)
  if (!comparison) notFound()
  const path = comparisonPath(comparison)

  return {
    title: comparison.title,
    description: comparison.description,
    alternates: { canonical: path },
    openGraph: {
      ...openGraph,
      title: `${comparison.title} · ${site.name}`,
      description: comparison.description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: comparison.title,
      description: comparison.description,
    },
  }
}

function FitCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={`${card} ${prose}`}>
      <h2>{title}</h2>
      <ul className="grid gap-3 text-ink">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <Check aria-hidden="true" className="mt-1 size-5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function Page({ params }: Props) {
  const comparison = getComparison((await params).slug)
  if (!comparison) notFound()

  const { name, checked, pricing } = comparison
  const url = new URL(comparisonPath(comparison), site.url).href
  const others = comparisons.filter((other) => other.slug !== comparison.slug)
  const keys = Object.keys(glanceLabels) as (keyof typeof glanceLabels)[]
  const rows = [
    ...keys.map((key) => [
      glanceLabels[key],
      aghostGlance[key],
      comparison.glance[key],
    ]),
    ...comparison.rows.map((row) => [row.label, row.aghost, row.them]),
  ]
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: comparison.title,
        description: comparison.description,
        inLanguage: "en",
        dateModified: `${checked}T00:00:00Z`,
        isPartOf: { "@id": `${site.url}/#website` },
        about: { "@id": `${site.url}/#app` },
        publisher: { "@id": `${site.url}/#organization` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          {
            "@type": "ListItem",
            position: 2,
            name: "Compare",
            item: `${site.url}/compare`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `aghost vs ${name}`,
            item: url,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: comparison.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  }

  return (
    <MarketingPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <PageIntro
        parent={{ href: "/compare", label: "Compare" }}
        category={`aghost vs ${name}`}
        title={`aghost vs ${name}`}
        description={comparison.description}
      />
      <section className={`${section} mt-0! grid gap-4`}>
        <div className={`${card} ${prose}`}>
          <h2>The short answer</h2>
          <p>{comparison.summary}</p>
          <p className="text-sm text-ink/55">
            Checked <time dateTime={checked}>{checkedOn(checked)}</time>. We
            build aghost. This comparison uses {name}’s public pricing, product
            and developer pages, linked below, and our own assessment; we didn’t
            run performance tests. Prices and features change.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FitCard title="Choose aghost if" items={comparison.fit.aghost} />
          <FitCard title={`Choose ${name} if`} items={comparison.fit.them} />
        </div>
      </section>
      <section
        id="at-a-glance"
        aria-labelledby="glance-heading"
        className={`${section} scroll-mt-24`}
      >
        <div className={`${card} ${prose}`}>
          <h2 id="glance-heading">aghost vs {name} at a glance</h2>
          <CompareTable
            caption={`aghost and ${name}, checked ${checkedOn(checked)}`}
            headings={["Compared", "aghost", name]}
            rows={rows}
          />
        </div>
      </section>
      <section className={`${section} grid gap-4 lg:grid-cols-2`}>
        {comparison.sections.map((part) => (
          <div
            key={part.id}
            id={part.id}
            className={`${card} ${prose} scroll-mt-24`}
          >
            <h2>{part.title}</h2>
            {part.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ))}
      </section>
      <section
        id="pricing"
        aria-labelledby="pricing-heading"
        className={`${section} scroll-mt-24`}
      >
        <div className={`${card} ${prose}`}>
          <h2 id="pricing-heading">What aghost and {name} cost</h2>
          {pricing.before.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {pricing.tables?.map((table) => (
            <CompareTable key={table.caption} {...table} />
          ))}
          {pricing.after?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <Link href="/pricing" className={`${textLink} w-fit`}>
            See aghost’s plans
          </Link>
        </div>
      </section>
      <section
        id="switching"
        className={`${section} grid scroll-mt-24 gap-4 lg:grid-cols-2`}
      >
        <div className={`${card} ${prose}`}>
          <h2>Switching from {name}</h2>
          {comparison.switching.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className={`${card} ${prose}`}>
          <h2>Sources</h2>
          <p>
            {name}’s pages, read on{" "}
            <time dateTime={checked}>{checkedOn(checked)}</time>:
          </p>
          <ul className="grid gap-2">
            {comparison.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} className={textLink}>
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p>
            aghost’s features and prices are on its{" "}
            <Link href="/features" className={textLink}>
              features
            </Link>{" "}
            and{" "}
            <Link href="/pricing" className={textLink}>
              pricing
            </Link>{" "}
            pages.
          </p>
        </div>
      </section>
      <section
        id="questions"
        aria-labelledby="questions-heading"
        className={`${section} scroll-mt-24`}
      >
        <div className={`${card} ${prose}`}>
          <h2 id="questions-heading">Frequently asked questions</h2>
          {comparison.faqs.map((faq) => (
            <div key={faq.question} className="grid gap-2">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
      <nav aria-labelledby="others-heading" className={section}>
        <h2
          id="others-heading"
          className="text-3xl font-normal tracking-[-0.03em]"
        >
          More comparisons
        </h2>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-lg">
          {others.map((other) => (
            <li key={other.slug}>
              <Link href={comparisonPath(other)} className={textLink}>
                aghost vs {other.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/compare" className={textLink}>
              All comparisons
            </Link>
          </li>
        </ul>
      </nav>
      <MarketingCta />
    </MarketingPage>
  )
}
