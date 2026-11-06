import type { Metadata } from "next"
import Link from "next/link"
import { CompareTable } from "@/features/marketing/compare-table"
import {
  aghostGlance,
  checkedOn,
  compareFaqs,
  comparisonPath,
  comparisons,
  glanceLabels,
  lastChecked,
} from "@/features/marketing/comparisons"
import { contactHref } from "@/features/marketing/contact"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  SectionHeading,
  card,
  prose,
  section,
  textLink,
} from "@/features/marketing/shell"
import { jsonLd } from "@/features/marketing/structured-data"
import { openGraph, site } from "@/lib/site"

const title = "Compare aghost with ManyChat, Buffer, Hootsuite and more"
const description =
  "How aghost compares with ManyChat, Chatfuel, LinkDM, Buffer, Hootsuite and Later on scheduling, Instagram comment-to-DM, AI agents and price."
const url = new URL("/compare", site.url).href

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/compare" },
  openGraph: { ...openGraph, title, description, url: "/compare" },
  twitter: { card: "summary_large_image", title, description },
}

const checked = lastChecked

const groups = [
  {
    kind: "messaging",
    title: "Instagram DM automation tools",
    description:
      "They answer comments and messages. aghost adds scheduling to six platforms, and costs no more as your audience grows.",
  },
  {
    kind: "scheduling",
    title: "Social media schedulers",
    description:
      "They publish your posts. aghost adds Instagram comment-to-DM automation to the same calendar.",
  },
] as const

const keys = Object.keys(glanceLabels) as (keyof typeof glanceLabels)[]

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: "en",
      dateModified: `${checked}T00:00:00Z`,
      isPartOf: { "@id": `${site.url}/#website` },
      about: { "@id": `${site.url}/#app` },
      publisher: { "@id": `${site.url}/#organization` },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: comparisons.map((comparison, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `aghost vs ${comparison.name}`,
          url: new URL(comparisonPath(comparison), site.url).href,
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: "Compare", item: url },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: compareFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
}

export default function Page() {
  return (
    <MarketingPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <PageIntro
        category="Compare"
        title="How aghost compares"
        description="Schedulers publish your posts. DM tools answer your comments. aghost does both, so here it is next to three of each."
      />
      <section className={`${section} mt-0!`}>
        <div className={`${card} ${prose}`}>
          <h2>The short answer</h2>
          <p>
            Pick a scheduler such as Buffer, Later or Hootsuite if you only
            publish posts, and a DM tool such as ManyChat, Chatfuel or LinkDM if
            you only answer messages. aghost does both for one flat price: it
            schedules to six platforms, turns Instagram comments into DMs, and
            lets your AI agent run either side over MCP.
          </p>
          <p className="text-sm text-ink/55">
            Checked <time dateTime={checked}>{checkedOn(checked)}</time>. We
            build aghost. Every fact about another product comes from its own
            public pages, linked on each comparison, and we didn’t run
            performance tests. Prices change, so{" "}
            <a
              href={contactHref("A comparison is out of date")}
              className={textLink}
            >
              tell us
            </a>{" "}
            if something’s out of date.
          </p>
        </div>
      </section>
      <section
        id="at-a-glance"
        aria-labelledby="glance-heading"
        className={`${section} scroll-mt-24`}
      >
        <div className={`${card} ${prose}`}>
          <h2 id="glance-heading">All seven at a glance</h2>
          <CompareTable
            caption={`aghost and six alternatives, checked ${checkedOn(checked)}`}
            headings={["Tool", ...keys.map((key) => glanceLabels[key])]}
            rows={[
              ["aghost", ...keys.map((key) => aghostGlance[key])],
              ...comparisons.map((comparison) => [
                <Link
                  key={comparison.slug}
                  href={comparisonPath(comparison)}
                  className={textLink}
                >
                  {comparison.name}
                </Link>,
                ...keys.map((key) => comparison.glance[key]),
              ]),
            ]}
            className="min-w-[64rem]"
          />
        </div>
      </section>
      {groups.map((group) => (
        <section
          key={group.kind}
          aria-labelledby={`${group.kind}-heading`}
          className={section}
        >
          <SectionHeading
            id={`${group.kind}-heading`}
            title={group.title}
            description={group.description}
          />
          <ul className="mt-10 grid gap-4 lg:grid-cols-3">
            {comparisons
              .filter((comparison) => comparison.kind === group.kind)
              .map((comparison) => (
                <li
                  key={comparison.slug}
                  className={`${card} grid content-start gap-5`}
                >
                  <h3 className="text-2xl font-normal tracking-[-0.03em]">
                    aghost vs {comparison.name}
                  </h3>
                  <p className="text-ink/70">{comparison.glance.what}</p>
                  <dl className="grid gap-4 text-[15px]">
                    <div className="grid gap-1">
                      <dt className="text-ink/60">Choose aghost if</dt>
                      <dd className="text-ink">{comparison.fit.aghost[0]}</dd>
                    </div>
                    <div className="grid gap-1">
                      <dt className="text-ink/60">
                        Choose {comparison.name} if
                      </dt>
                      <dd className="text-ink">{comparison.fit.them[0]}</dd>
                    </div>
                  </dl>
                  <Link
                    href={comparisonPath(comparison)}
                    className={`${textLink} w-fit`}
                  >
                    Read aghost vs {comparison.name}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section
        id="questions"
        aria-labelledby="questions-heading"
        className={`${section} scroll-mt-24`}
      >
        <div className={`${card} ${prose}`}>
          <h2 id="questions-heading">Frequently asked questions</h2>
          {compareFaqs.map((faq) => (
            <div key={faq.question} className="grid gap-2">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
      <nav aria-labelledby="reading-heading" className={section}>
        <h2
          id="reading-heading"
          className="text-3xl font-normal tracking-[-0.03em]"
        >
          More reading
        </h2>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-lg">
          <li>
            <Link
              href="/blog/best-instagram-dm-automation-tools"
              className={textLink}
            >
              6 best Instagram DM automation tools
            </Link>
          </li>
          <li>
            <Link href="/blog/instagram-dm-limits" className={textLink}>
              Instagram DM limits
            </Link>
          </li>
          <li>
            <Link href="/features" className={textLink}>
              aghost features
            </Link>
          </li>
          <li>
            <Link href="/pricing" className={textLink}>
              aghost pricing
            </Link>
          </li>
        </ul>
      </nav>
      <MarketingCta />
    </MarketingPage>
  )
}
