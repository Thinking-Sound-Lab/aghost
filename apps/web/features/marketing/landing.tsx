import Link from "next/link"
import { ChevronDown, Code2, ShoppingBag, Smile } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { site } from "@/lib/site"
import {
  ClaudeCodeApp,
  CodexApp,
  CursorApp,
  McpSettingsApp,
} from "./agent-apps"
import {
  ClaudeLogo,
  CodexLogo,
  CursorLogo,
  DotsLogo,
  GrokBotLogo,
  McpLogo,
  MuseLogo,
} from "./agent-logos"
import { contactHref } from "./contact"
import { agentClients, audiences, faqs, heroSummary, steps } from "./content"
import { FeatureBoard, mascotTones } from "./feature-board"
import { LaunchVideo } from "./launch-video"
import { MarketingGuides } from "./guides"
import {
  AgentWindow,
  BuilderWindow,
  RestScene,
  Screen,
  stepScenes,
} from "./illustrations"
import {
  CtaBand,
  Doodles,
  GetStarted,
  MarketingCta,
  MarketingPage,
  Pill,
  Scribble,
  SectionHeading,
  outlineButton,
  textLink,
} from "./shell"

const demoAccount = { username: "aghost", picture: "/mascot.png" }

/** The agents the headline cycles through. */
const agents = [
  { name: "Claude", Logo: ClaudeLogo },
  { name: "Codex", Logo: CodexLogo },
  { name: "Grok Bot", Logo: GrokBotLogo },
  { name: "Muse", Logo: MuseLogo },
  { name: "OpenAI dots", Logo: DotsLogo },
]

/** One agent at a time; the list ends with the first again, so it loops. */
function AgentNames() {
  return (
    <span aria-hidden="true" className="block h-[1.2em] overflow-hidden">
      <span className="marketing-rotate block">
        {[...agents, ...agents.slice(0, 1)].map(({ name, Logo }, index) => (
          <span
            key={index}
            className="flex h-[1.2em] items-center justify-center gap-[0.22em]"
          >
            <Logo className="size-[0.9em]" />
            {name}
          </span>
        ))}
      </span>
    </span>
  )
}

function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="group relative">
      <Doodles />
      <div className="relative mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <h1
            id="hero-heading"
            className="text-[clamp(2.5rem,6.2vw,4.75rem)] leading-[1.08] font-extrabold tracking-[-0.045em] text-balance"
          >
            Grow on Instagram on autopilot with
            <span className="sr-only"> your AI agent</span>
            <AgentNames />
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg text-pretty text-white/70 sm:text-xl">
            {heroSummary}
          </p>
          <div className="mt-9 flex justify-center">
            <GetStarted className="px-8 py-4 text-base" />
          </div>
        </div>
        <fieldset className="mt-14 flex justify-center">
          <legend className="sr-only">How do you want to set it up?</legend>
          <div className="inline-flex rounded-full bg-white/10 p-1 text-sm font-semibold whitespace-nowrap sm:text-[15px]">
            <input
              type="radio"
              name="hero-mode"
              id="hero-agent"
              defaultChecked
              className="peer/agent sr-only"
            />
            <label
              htmlFor="hero-agent"
              className="cursor-pointer rounded-full px-4 py-2.5 text-white/70 peer-checked/agent:bg-white peer-checked/agent:text-black peer-focus-visible/agent:ring-2 peer-focus-visible/agent:ring-brand sm:px-5"
            >
              My agent sets it up
            </label>
            <input
              type="radio"
              name="hero-mode"
              id="hero-classic"
              className="peer/classic sr-only"
            />
            <label
              htmlFor="hero-classic"
              className="cursor-pointer rounded-full px-4 py-2.5 text-white/70 peer-checked/classic:bg-white peer-checked/classic:text-black peer-focus-visible/classic:ring-2 peer-focus-visible/classic:ring-brand sm:px-5"
            >
              I’ll do it myself
            </label>
          </div>
        </fieldset>
        <div className="mt-8 rounded-[2rem] bg-linear-to-br from-brand-blue via-[#1f6bff] to-brand-cyan p-4 sm:p-10">
          <div className="flex items-center justify-center gap-10 group-has-[#hero-classic:checked]:hidden">
            <AgentWindow className="w-full max-w-xl" />
            <div className="max-lg:hidden">
              <InstagramPreview
                account={demoAccount}
                screen="dm"
                post={null}
                keyword={null}
                commentReply={null}
                openingDm={null}
                dmMessage="Hey {{first_name}}! Here's the free guide you asked for ✨"
                buttons={["Get the guide"]}
              />
            </div>
          </div>
          <div className="hidden items-center justify-center gap-10 group-has-[#hero-classic:checked]:flex">
            <BuilderWindow className="w-full max-w-xl" />
            <div className="max-lg:hidden">
              <InstagramPreview
                account={demoAccount}
                screen="post"
                post={{
                  thumbnailUrl: "/mascot.png",
                  caption: "Comment GUIDE for the guide 👇",
                  likeCount: null,
                }}
                keyword="GUIDE"
                commentReply="Sent you a DM, {{first_name}} ✨"
                openingDm={null}
                dmMessage=""
                buttons={[]}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const audienceIcons = [
  <Smile key="creators" className="size-14 text-brand" strokeWidth={1.5} />,
  <ShoppingBag
    key="brands"
    className="size-14 text-brand-cyan"
    strokeWidth={1.5}
  />,
  <Code2
    key="developers"
    className="size-14 text-brand-orange"
    strokeWidth={1.5}
  />,
]

function Audiences() {
  return (
    <section
      aria-labelledby="audiences-heading"
      className="mx-auto mt-32 max-w-7xl px-5 sm:px-8"
    >
      <SectionHeading id="audiences-heading" title="Who is aghost for?" />
      <ul className="mt-14 grid gap-12 text-center md:grid-cols-3">
        {audiences.map((audience, index) => (
          <li
            key={audience.title}
            className="grid content-start justify-items-center gap-4"
          >
            <span aria-hidden="true">{audienceIcons[index]}</span>
            <h3 className="text-2xl font-extrabold tracking-[-0.03em]">
              {audience.title}
            </h3>
            <p className="max-w-sm text-lg text-white/70">{audience.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="mx-auto mt-32 max-w-7xl scroll-mt-24 px-5 sm:px-8"
    >
      <SectionHeading
        id="how-heading"
        title={
          <>
            Live in <Scribble>3 steps</Scribble>
          </>
        }
        description="Your dashboard is always there. Bring an agent if you want a hand."
      />
      <ol className="mt-14 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="grid content-start gap-5 rounded-[2rem] bg-[#161616] p-7 ring-1 ring-white/10"
          >
            <Pill className="bg-brand text-black">Step {index + 1}</Pill>
            <Screen className="min-h-40 bg-black">{stepScenes[index]}</Screen>
            <h3 className="text-2xl font-extrabold tracking-[-0.03em]">
              {step.title}
            </h3>
            <p className="text-white/70">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Agents() {
  const clients = [
    {
      name: "Claude Code",
      Logo: ClaudeLogo,
      text: "Build and switch on automations from your terminal, in plain words.",
      tone: "orange",
      picture: <ClaudeCodeApp />,
    },
    {
      name: "Codex",
      Logo: CodexLogo,
      text: "Ask how an automation is doing, then ask your agent to improve it.",
      tone: "blue",
      picture: <CodexApp />,
    },
    {
      name: "Cursor",
      Logo: CursorLogo,
      text: "Read the inbox and answer DMs without leaving your editor.",
      tone: "cyan",
      picture: <CursorApp />,
    },
    {
      name: "any MCP client",
      Logo: McpLogo,
      text: "Anything that speaks MCP over HTTP with a Bearer token can connect.",
      tone: "green",
      picture: <McpSettingsApp endpoint={`${site.url}/api/mcp`} />,
    },
  ] as const
  return (
    <section
      id="agents"
      aria-labelledby="agents-heading"
      className="mx-auto mt-32 max-w-7xl scroll-mt-24 px-5 sm:px-8"
    >
      <SectionHeading
        id="agents-heading"
        title={
          <>
            Let your <Scribble>AI agent</Scribble> run your DMs
          </>
        }
        description={`Give ${agentClients.join(", ")}, or any MCP client an API key. It builds automations, reads their stats, and answers your inbox. You review it all in the dashboard.`}
      />
      <ul className="mt-14 grid gap-4 lg:grid-cols-2">
        {clients.map(({ name, Logo, text, tone, picture }, index) => (
          <li
            key={name}
            className={cn(
              "flex min-w-0 flex-col gap-8 rounded-[2rem] p-6 sm:p-10",
              mascotTones[tone],
              index % 2 === 1 && "lg:flex-col-reverse lg:justify-end"
            )}
          >
            <div className="grid gap-3">
              <h3 className="flex items-center gap-3 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                <Logo className="size-10 shadow-lg shadow-black/15" />
                Via {name}
              </h3>
              <p
                className={cn(
                  "text-lg",
                  tone === "blue" ? "text-white/85" : "text-black/75"
                )}
              >
                {text}
              </p>
            </div>
            {picture}
          </li>
        ))}
        <li
          className={cn(
            "grid min-w-0 items-center gap-10 rounded-[2rem] p-6 sm:p-10 lg:col-span-2 lg:grid-cols-[2fr_3fr]",
            mascotTones.red
          )}
        >
          <div className="grid content-start gap-4">
            <Code2 aria-hidden="true" className="size-10" />
            <h3 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
              Automate everything
            </h3>
            <p className="text-lg text-black/75">
              Not using MCP? The same API key works with the REST API from
              scripts and your own apps. An OpenAPI document describes every
              endpoint.
            </p>
            <Link
              href="/agents#rest-api"
              className="w-fit underline decoration-black/40 underline-offset-4 hover:decoration-black"
            >
              REST API setup
            </Link>
          </div>
          <RestScene endpoint={`${site.url}/api/v1/automations`} />
        </li>
      </ul>
      <div className="mt-10 text-center">
        <Link href="/agents" className={outlineButton}>
          Connect your agent
        </Link>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mt-32 scroll-mt-24"
    >
      <SectionHeading
        id="features-heading"
        title={
          <>
            Everything you need to <Scribble>grow on Instagram</Scribble>
          </>
        }
        className="px-5 [&_h2]:text-[clamp(1.875rem,6vw,3rem)] [&_svg]:text-brand-blue"
      />
      <div className="mt-14">
        <FeatureBoard agentic scheduling layout="overview" />
      </div>
      <div className="mt-10 text-center">
        <Link href="/features" className={outlineButton}>
          Explore all features
        </Link>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mx-auto mt-32 grid max-w-7xl scroll-mt-24 gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_2fr]"
    >
      <div>
        <h2
          id="faq-heading"
          className="text-4xl font-extrabold tracking-[-0.035em] sm:text-5xl lg:sticky lg:top-28"
        >
          Frequently asked questions
        </h2>
        <p className="mt-5 text-lg text-white/70">
          Something else?{" "}
          <a href={contactHref()} className={textLink}>
            Email us
          </a>
          .
        </p>
      </div>
      <div className="grid content-start gap-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl bg-[#161616] ring-1 ring-white/10"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-2xl px-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
              <h3 className="text-lg font-bold">{faq.question}</h3>
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="px-6 pb-6 text-white/70">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Landing() {
  return (
    <MarketingPage>
      <Hero />
      <HowItWorks />
      <Features />
      <Audiences />
      <LaunchVideo />
      <Agents />
      <MarketingGuides
        title="Plan your next Instagram campaign"
        description="Set up auto replies, compare costs, and choose a workflow that fits your audience."
        slugs={[
          "instagram-auto-reply",
          "aghost-vs-chatfuel",
          "manychat-alternatives",
        ]}
      />
      <div className="mt-28">
        <CtaBand />
      </div>
      <Faq />
      <MarketingCta />
    </MarketingPage>
  )
}
