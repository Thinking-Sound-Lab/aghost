import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, Code2, Terminal } from "lucide-react"
import { agentAbilities, agentClients } from "@/features/marketing/content"
import { McpConfigApp } from "@/features/marketing/agent-apps"
import { RestScene } from "@/features/marketing/illustrations"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  Painting,
  Pill,
  SectionHeading,
  card,
  primaryButton,
  prose,
  section,
  textLink,
} from "@/features/marketing/shell"
import { openGraph, site } from "@/lib/site"

const description =
  "Connect Claude Code, Codex, Cursor or any MCP client to schedule posts to six platforms, run Instagram DM automations and read analytics."
export const metadata: Metadata = {
  title: "Social media MCP server and REST API for AI agents",
  description,
  alternates: { canonical: "/agents" },
  openGraph: {
    ...openGraph,
    title: "Social media MCP server and REST API for AI agents · aghost",
    description,
    url: "/agents",
  },
}

const connectionSteps = [
  {
    title: "Get your workspace ready",
    text: "Sign in with Google, choose a plan, and connect your channels in Settings → Channels. Comment automations need an Instagram professional account.",
  },
  {
    title: "Create an API key",
    text: "Open Settings → API and create a key for your agent. Store it in its environment or secret store. The full key is shown once.",
  },
  {
    title: "Give it the setup skill",
    text: "Use Copy skill in Settings → MCP, or read the public setup skill. It walks your agent through configuration and a read-only connection check.",
  },
]

const clientTones = ["sky", "gold", "dusk"] as const

const exampleRequests = [
  {
    title: "Post a launch everywhere",
    prompt:
      "Schedule my launch video for Friday at 6 PM on Instagram, LinkedIn, X and YouTube. Write a shorter caption for X and a title for YouTube. Show me each version before scheduling.",
    check:
      "Review each channel’s caption, media and time in your agent’s summary. Every copy then appears in the calendar.",
  },
  {
    title: "Schedule a reel with its DM",
    prompt:
      "Schedule my reel for Friday at 6 PM and DM my guide to anyone who comments GUIDE. Show me the caption, time and DM first.",
    check:
      "Review the reel, time and automation in your agent’s summary, then in the calendar.",
  },
  {
    title: "Compare your channels",
    prompt:
      "Which channel did best this month? Compare views and engagement on Instagram, LinkedIn and YouTube, and suggest a posting time for each.",
    check:
      "Compare with Analytics in aghost. A blank metric means the platform doesn’t report it.",
  },
] as const

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="AI agents"
        title="Run your social media from your AI agent"
        description={description}
      />
      <section
        className={`${section} mt-0! grid items-center gap-12 lg:grid-cols-2`}
      >
        <div className={prose}>
          <h2>What your agent can do</h2>
          <p>
            Your agent works in your workspace, on every channel you connect.
          </p>
          <ul className="grid gap-3 text-ink">
            {agentAbilities.map((ability) => (
              <li key={ability} className="flex items-start gap-3">
                <Check aria-hidden="true" className="mt-1 size-5 shrink-0" />
                {ability}
              </li>
            ))}
          </ul>
          <a href="/api/mcp/skill.md" className={`${primaryButton} mt-3 w-fit`}>
            Read the setup skill
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <Painting tone="dusk" className="p-5 sm:p-10">
          <McpConfigApp endpoint={`${site.url}/api/mcp`} />
        </Painting>
      </section>
      <section
        id="connection"
        aria-labelledby="connection-heading"
        className={`${section} scroll-mt-24`}
      >
        <SectionHeading
          id="connection-heading"
          title="Connect once. Then ask."
          description="The MCP connection uses HTTP and an API key in the Authorization header. Use a client that supports Bearer tokens or custom headers."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {connectionSteps.map((step, index) => (
            <li key={step.title} className={`${card} grid content-start gap-4`}>
              <Pill>Step {index + 1}</Pill>
              <h3 className="text-2xl font-medium tracking-[-0.035em]">
                {step.title}
              </h3>
              <p className="text-ink/65">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="clients-heading" className={section}>
        <SectionHeading
          id="clients-heading"
          title="Bring the agent you already use"
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {agentClients.map((agent, index) => (
            <Painting
              key={agent}
              tone={clientTones[index] ?? "sky"}
              className={`grid scroll-mt-24 content-start gap-4 p-8 ${clientTones[index] === "dusk" ? "text-white" : "text-ink"}`}
            >
              <article
                id={agent.toLowerCase().replaceAll(" ", "-")}
                className="grid content-start gap-4"
              >
                <Terminal aria-hidden="true" className="size-8" />
                <h3 className="text-3xl font-medium tracking-[-0.04em]">
                  {agent}
                </h3>
                <p className="opacity-85">
                  The setup skill includes configuration for {agent}. Give it
                  the skill and make your aghost API key available through its
                  environment or secret store.
                </p>
                <a
                  href="/api/mcp/skill.md"
                  className="w-fit underline decoration-current/40 underline-offset-4 hover:decoration-current"
                >
                  Read {agent} setup
                </a>
              </article>
            </Painting>
          ))}
        </div>
      </section>
      <section aria-labelledby="examples-heading" className={section}>
        <SectionHeading
          id="examples-heading"
          title="Three ways to put your agent to work"
          description="Example requests for Claude Code, Codex, Cursor, or another connected MCP client. Supply your own media and links, then review the result in aghost."
        />
        <ul className="mt-10 grid gap-4 lg:grid-cols-3">
          {exampleRequests.map((example) => (
            <li
              key={example.title}
              className={`${card} grid content-start gap-5`}
            >
              <h3 className="text-2xl font-medium tracking-[-0.035em]">
                {example.title}
              </h3>
              <blockquote className="border-l-2 border-ink pl-4 text-ink/80">
                “{example.prompt}”
              </blockquote>
              <div className="grid gap-2 text-sm leading-relaxed text-ink/65">
                <p className="font-medium text-ink">What to check</p>
                <p>{example.check}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-3xl text-center text-ink/65">
          Scheduled posts publish at the chosen time. Active automations can
          send real messages after a qualifying interaction. Review Instagram’s{" "}
          <Link href="/blog/instagram-dm-limits" className={textLink}>
            messaging windows and limits
          </Link>{" "}
          when planning your campaign.
        </p>
      </section>
      <section className={section}>
        <div className={`${card} ${prose}`}>
          <h2>Keep the keys</h2>
          <p>
            A key gives your agent access to your workspace’s scheduled posts,
            automations, analytics, contacts, and inbox. Give it only to an
            agent you trust and revoke it in Settings → API when you’re
            finished.
          </p>
          <p>
            Agents cannot create more API keys, change workspace settings, or
            connect or disconnect accounts. Those actions stay in your
            dashboard.
          </p>
          <Link href="/privacy-policy#agents" className={`${textLink} w-fit`}>
            What your agent can access
          </Link>
        </div>
      </section>
      <section
        id="rest-api"
        aria-labelledby="rest-heading"
        className={`${section} scroll-mt-24`}
      >
        <Painting
          tone="sky"
          className="grid items-center gap-10 p-7 text-ink sm:p-10 lg:grid-cols-[2fr_3fr]"
        >
          <div className="grid min-w-0 content-start gap-4">
            <Code2 aria-hidden="true" className="size-10" />
            <h2
              id="rest-heading"
              className="text-4xl font-medium tracking-[-0.045em] sm:text-5xl"
            >
              There’s an API, too
            </h2>
            <p className="text-lg text-ink/80">
              Use the same workspace API key for scripts and clients that don’t
              use MCP. Settings → API has the REST setup guide. The OpenAPI
              document describes the endpoints and requires your API key.
            </p>
            <dl className="grid gap-3">
              {[
                { name: "MCP endpoint", path: "/api/mcp" },
                { name: "REST base URL", path: "/api/v1" },
                { name: "OpenAPI document", path: "/api/v1/openapi.json" },
              ].map((endpoint) => (
                <div key={endpoint.path}>
                  <dt className="text-sm text-ink/65">{endpoint.name}</dt>
                  <dd>
                    <code className="font-mono text-sm break-all">
                      {site.url}
                      {endpoint.path}
                    </code>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <RestScene endpoint={`${site.url}/api/v1/automations`} />
        </Painting>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
