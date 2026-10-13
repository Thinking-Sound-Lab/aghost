import type { Metadata } from "next"
import Link from "next/link"
import { Check, ChevronsRight, Code2, Terminal } from "lucide-react"
import { agentAbilities, agentClients } from "@/features/marketing/content"
import { gradients } from "@/features/marketing/feature-board"
import { McpConfigApp } from "@/features/marketing/agent-apps"
import { RestScene } from "@/features/marketing/illustrations"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
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
  "Connect Claude Code, Codex, Cursor, or any HTTP MCP client to manage Instagram automations, read stats, and answer your inbox in aghost."
export const metadata: Metadata = {
  title: "AI agents, MCP, and REST API",
  description,
  alternates: { canonical: "/agents" },
  openGraph: {
    ...openGraph,
    title: "AI agents, MCP, and REST API · aghost",
    description,
    url: "/agents",
  },
}

const connectionSteps = [
  {
    title: "Get your workspace ready",
    text: "Sign in with Google, choose a plan, and connect your Instagram professional account in Settings → Channels.",
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

const clientGradients = [gradients.blue, gradients.teal, gradients.ocean]

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="AI agents"
        title="Run aghost from your AI agent"
        description={description}
      />
      <section
        className={`${section} mt-0! grid items-center gap-12 lg:grid-cols-2`}
      >
        <div className={prose}>
          <h2>What your agent can do</h2>
          <p>
            Your agent works in the same workspace you use. Ask for an
            automation, check how it’s doing, or get help with a reply.
          </p>
          <ul className="grid gap-3 text-white">
            {agentAbilities.map((ability) => (
              <li key={ability} className="flex items-start gap-3">
                <Check
                  aria-hidden="true"
                  className="mt-1 size-5 shrink-0 text-brand"
                />
                {ability}
              </li>
            ))}
          </ul>
          <a href="/api/mcp/skill.md" className={`${primaryButton} mt-3 w-fit`}>
            Read the setup skill
            <ChevronsRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <div className={`rounded-[2rem] p-5 sm:p-10 ${gradients.deep}`}>
          <McpConfigApp endpoint={`${site.url}/api/mcp`} />
        </div>
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
              <Pill className="bg-brand text-black">Step {index + 1}</Pill>
              <h3 className="text-2xl font-extrabold tracking-[-0.03em]">
                {step.title}
              </h3>
              <p className="text-white/70">{step.text}</p>
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
            <article
              key={agent}
              id={agent.toLowerCase().replaceAll(" ", "-")}
              className={`grid scroll-mt-24 content-start gap-4 rounded-[2rem] p-8 ${clientGradients[index]}`}
            >
              <Terminal aria-hidden="true" className="size-8" />
              <h3 className="text-3xl font-extrabold tracking-[-0.03em]">
                {agent}
              </h3>
              <p className="text-white/85">
                The setup skill includes configuration for {agent}. Give it the
                skill and make your aghost API key available through its
                environment or secret store.
              </p>
              <a href="/api/mcp/skill.md" className={`${textLink} w-fit`}>
                Read {agent} setup
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className={`${section} grid gap-4 lg:grid-cols-2`}>
        <div className={`${card} ${prose}`}>
          <h2>Start with a clear request</h2>
          <blockquote className="border-l-4 border-brand pl-5 text-xl font-semibold text-white">
            “Find my latest reel. Create a paused automation for people who
            comment GUIDE. Ask them to follow first. Show me the message before
            turning it on.”
          </blockquote>
          <p className="text-base">
            Review the post, trigger, and message in your dashboard. Activating
            an automation or sending an inbox reply can deliver real messages.
          </p>
        </div>
        <div className={`${card} ${prose}`}>
          <h2>Keep the keys</h2>
          <p>
            A key gives your agent access to your workspace’s automations,
            stats, contacts, and inbox. Give it only to an agent you trust and
            revoke it in Settings → API when you’re finished.
          </p>
          <p>
            Agents cannot create more API keys, change workspace settings, or
            connect or disconnect Instagram accounts. Those actions stay in your
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
        <div
          className={`grid items-center gap-10 rounded-[2rem] p-7 sm:p-10 lg:grid-cols-[2fr_3fr] ${gradients.blue}`}
        >
          <div className="grid min-w-0 content-start gap-4">
            <Code2 aria-hidden="true" className="size-10" />
            <h2
              id="rest-heading"
              className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl"
            >
              There’s an API, too
            </h2>
            <p className="text-lg text-white/85">
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
                  <dt className="text-sm text-white/70">{endpoint.name}</dt>
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
        </div>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
