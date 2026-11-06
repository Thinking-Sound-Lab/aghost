import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import {
  agentPlatformPath,
  agentPlatforms,
  getAgentPlatform,
  mediaRules,
  platformLimits,
  sharedAbilities,
  sharedTools,
} from "@/features/marketing/agent-platforms"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  Pill,
  SectionHeading,
  card,
  prose,
  section,
  textLink,
} from "@/features/marketing/shell"
import { openGraph, site } from "@/lib/site"

type Props = { params: Promise<{ platform: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return agentPlatforms.map((page) => ({ platform: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getAgentPlatform((await params).platform)
  if (!page) notFound()
  const path = agentPlatformPath(page)

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      ...openGraph,
      title: `${page.title} · ${site.name}`,
      description: page.description,
      url: path,
    },
  }
}

const endpoint = `${site.url}/api/mcp`

const apiKeyConfig = JSON.stringify(
  {
    mcpServers: {
      aghost: {
        type: "http",
        url: endpoint,
        headers: { Authorization: "Bearer YOUR_API_KEY" },
      },
    },
  },
  null,
  2
)

export default async function Page({ params }: Props) {
  const page = getAgentPlatform((await params).platform)
  if (!page) notFound()

  const url = new URL(agentPlatformPath(page), site.url).href
  const others = agentPlatforms.filter((other) => other.slug !== page.slug)
  const abilities = [...page.abilities, ...sharedAbilities]
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: "en",
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
            name: "AI agents",
            item: `${site.url}/agents`,
          },
          { "@type": "ListItem", position: 3, name: page.heading, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: page.faqs.map((faq) => ({
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <PageIntro
        parent={{ href: "/agents", label: "AI agents" }}
        category={page.heading}
        title={page.heading}
        description={page.description}
      />
      <section className={`${section} mt-0! grid gap-4 lg:grid-cols-2`}>
        <div className={`${card} ${prose}`}>
          <h2>What is the aghost {page.heading}?</h2>
          <p>{page.answer}</p>
          <p>
            Connect it at{" "}
            <code className="font-mono text-base break-all text-ink">
              {endpoint}
            </code>
            . It’s included on every plan.
          </p>
        </div>
        <div className={`${card} ${prose}`}>
          <h2>What your agent can do</h2>
          <ul className="grid gap-3 text-ink">
            {abilities.map((ability) => (
              <li key={ability} className="flex items-start gap-3">
                <Check aria-hidden="true" className="mt-1 size-5 shrink-0" />
                {ability}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section
        id="formats"
        aria-labelledby="formats-heading"
        className={`${section} grid scroll-mt-24 gap-4 lg:grid-cols-2`}
      >
        <div className={`${card} ${prose}`}>
          <h2 id="formats-heading">What it can post</h2>
          <ul className="grid list-disc gap-2 pl-6">
            {page.formats.map((format) => (
              <li key={format}>{format}</li>
            ))}
          </ul>
          <p>{mediaRules}</p>
          <p>
            <span className="text-ink">To connect: </span>
            {page.connect}
          </p>
        </div>
        <div className={`${card} ${prose}`}>
          <h2>Limits and metrics</h2>
          <dl className="grid gap-4">
            {platformLimits(page.platform).map((limit) => (
              <div key={limit.name} className="grid gap-1">
                <dt className="text-sm text-ink/65">{limit.name}</dt>
                <dd className="text-ink">{limit.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-base">
            Every copy is checked against these limits before anything is
            scheduled.
          </p>
        </div>
      </section>
      <section
        id="connect"
        aria-labelledby="connect-heading"
        className={`${section} scroll-mt-24`}
      >
        <SectionHeading
          id="connect-heading"
          title="Connect once. Then ask."
          description="Choose a plan and connect your channels in Settings → Channels first. Your agent connects in one of two ways."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className={`${card} ${prose}`}>
            <Pill>Sign in</Pill>
            <h3>Apps with MCP sign-in</h3>
            <p>
              In Claude, open Customize → Connectors → Add custom connector and
              paste the URL. Leave the client ID and secret empty, then choose
              Allow in aghost.
            </p>
            <code className="font-mono text-base break-all text-ink">
              {endpoint}
            </code>
          </div>
          <div className={`${card} ${prose}`}>
            <Pill>API key</Pill>
            <h3>Claude Code, Codex, Cursor and others</h3>
            <p>
              Create a key in Settings → API and keep it in your agent’s
              environment or secret store. The{" "}
              <a href="/api/mcp/skill.md" className={textLink}>
                setup skill
              </a>{" "}
              has each client’s steps.
            </p>
            <pre className="overflow-x-auto rounded-[12px] bg-ink p-4 font-mono text-sm text-white">
              <code>{apiKeyConfig}</code>
            </pre>
          </div>
        </div>
      </section>
      <section aria-labelledby="examples-heading" className={section}>
        <SectionHeading
          id="examples-heading"
          title={`Ask your agent about ${page.heading.replace(" MCP server", "")}`}
          description="Supply your own media and links, then review the result in aghost. Scheduled posts publish at their time."
        />
        <ul className="mt-10 grid gap-4 lg:grid-cols-3">
          {page.prompts.map((example) => (
            <li
              key={example.title}
              className={`${card} grid content-start gap-5`}
            >
              <h3 className="text-2xl font-normal tracking-[-0.03em]">
                {example.title}
              </h3>
              <blockquote className="border-l-2 border-ink pl-4 text-ink/80">
                “{example.prompt}”
              </blockquote>
            </li>
          ))}
        </ul>
      </section>
      <section
        id="tools"
        className={`${section} grid scroll-mt-24 gap-4 lg:grid-cols-2`}
      >
        <div className={`${card} ${prose}`}>
          <h2>MCP tools it uses</h2>
          <ul className="flex flex-wrap gap-2">
            {[...page.tools, ...sharedTools].map((tool) => (
              <li key={tool}>
                <code className="rounded-[8px] bg-ink/5 px-2 py-1 font-mono text-sm text-ink">
                  {tool}
                </code>
              </li>
            ))}
          </ul>
          <p>The same workspace API key works with the REST API:</p>
          <code className="font-mono text-base break-all text-ink">
            {site.url}/api/v1
          </code>
        </div>
        <div className={`${card} ${prose}`}>
          <h2>Keep the keys</h2>
          <p>
            Agents cannot create API keys, change workspace settings, or connect
            or disconnect accounts. Revoke a key or an app in Settings → API
            whenever you’re finished.
          </p>
          <Link href="/privacy-policy#agents" className={`${textLink} w-fit`}>
            What your agent can access
          </Link>
        </div>
      </section>
      <section
        id="questions"
        aria-labelledby="questions-heading"
        className={`${section} scroll-mt-24`}
      >
        <div className={`${card} ${prose}`}>
          <h2 id="questions-heading">Frequently asked questions</h2>
          {page.faqs.map((faq) => (
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
          The same server on other platforms
        </h2>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-lg">
          {others.map((other) => (
            <li key={other.slug}>
              <Link href={agentPlatformPath(other)} className={textLink}>
                {other.heading}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/agents" className={textLink}>
              All AI agent features
            </Link>
          </li>
        </ul>
      </nav>
      <MarketingCta />
    </MarketingPage>
  )
}
