import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Check, Code2, Terminal } from "lucide-react"
import { agentAbilities, agentClients } from "@/features/marketing/content"
import { AgentScene } from "@/features/marketing/illustrations"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  marketingButton,
  marketingLink,
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

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="AI agents"
        title="Your agent. Meet aghost."
        description={description}
      />
      <section className="notebook-section notebook-two-column">
        <div className="notebook-prose">
          <h2 className="notebook-title">The words and the tools.</h2>
          <p>
            Your agent can work in the same workspace you use. Ask for an
            automation, check how it’s doing, or get help with a reply.
          </p>
          <ul className="mt-6 grid gap-4 text-sm">
            {agentAbilities.map((ability) => (
              <li key={ability} className="flex items-start gap-3">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0" />
                {ability}
              </li>
            ))}
          </ul>
          <a href="/api/mcp/skill.md" className={`${marketingButton} mt-7`}>
            Read the setup skill{" "}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <div className="notebook-agent-picture">
          <div className="notebook-illustration">
            <AgentScene endpoint={`${site.url}/api/mcp`} />
          </div>
          <p className="notebook-hand">Like having an extra pair of hands.</p>
        </div>
      </section>
      <section id="connection" className="notebook-values">
        <div className="notebook-section">
          <p className="notebook-hand notebook-section-kicker">
            Let’s make the introduction.
          </p>
          <h2 className="notebook-title notebook-section-heading mb-10">
            Connect once. Then ask.
          </h2>
          <ol className="notebook-steps">
            {connectionSteps.map((step, index) => (
              <li key={step.title} className="notebook-step">
                <span className="notebook-hand notebook-step-number">
                  Step {index + 1}
                </span>
                <h3 className="notebook-title">{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="notebook-small-print mt-8 max-w-3xl">
            The MCP connection uses HTTP and an API key in the Authorization
            header. Use a client that supports Bearer tokens or custom headers.
            Keep your key in your agent’s environment or secret store.
          </p>
        </div>
      </section>
      <section className="notebook-section" aria-label="Agent clients">
        <p className="notebook-hand notebook-section-kicker">
          Bring the agent you know.
        </p>
        <h2 className="notebook-title notebook-section-heading mb-10">
          Good company.
        </h2>
        <div className="notebook-note-grid notebook-agent-clients">
          {agentClients.map((agent) => (
            <article
              key={agent}
              id={agent.toLowerCase().replaceAll(" ", "-")}
              className="notebook-paper-note"
            >
              <Terminal aria-hidden="true" className="size-6" />
              <h3 className="notebook-title">{agent}</h3>
              <p>
                The setup skill includes configuration for {agent}. Give it the
                skill and make your aghost API key available through its
                environment or secret store.
              </p>
              <a href="/api/mcp/skill.md" className={marketingLink}>
                Read {agent} setup
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className="notebook-section notebook-two-column pt-0!">
        <div className="notebook-paper-note">
          <h2 className="notebook-title text-4xl">
            Start with a clear request.
          </h2>
          <blockquote className="notebook-hand mt-6 text-3xl">
            “Find my latest reel. Create a paused automation for people who
            comment GUIDE. Ask them to follow first. Show me the message before
            turning it on.”
          </blockquote>
          <p className="notebook-small-print mt-6">
            Review the post, trigger, and message in your dashboard. Activating
            an automation or sending an inbox reply can deliver real messages.
          </p>
        </div>
        <div className="notebook-prose">
          <h2 className="notebook-title">Keep the keys.</h2>
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
          <Link
            href="/privacy-policy#agents"
            className={`${marketingLink} mt-5 inline-block text-sm`}
          >
            What your agent can access
          </Link>
        </div>
      </section>
      <section
        id="rest-api"
        className="notebook-section border-t border-black/20"
      >
        <div className="notebook-two-column">
          <div>
            <Code2 aria-hidden="true" className="mb-6 size-7" />
            <p className="notebook-hand notebook-section-kicker">
              For scripts and other clients.
            </p>
            <h2 className="notebook-title notebook-section-heading">
              There’s an API, too.
            </h2>
          </div>
          <div className="notebook-prose">
            <p>
              Use the same workspace API key for scripts and clients that don’t
              use MCP. Settings → API has the REST setup guide. The OpenAPI
              document describes the endpoints and requires your API key.
            </p>
            <dl className="notebook-endpoints">
              {[
                { name: "MCP endpoint", path: "/api/mcp" },
                { name: "REST base URL", path: "/api/v1" },
                { name: "OpenAPI document", path: "/api/v1/openapi.json" },
              ].map((endpoint) => (
                <div key={endpoint.path}>
                  <dt>{endpoint.name}</dt>
                  <dd>
                    <code>
                      {site.url}
                      {endpoint.path}
                    </code>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
