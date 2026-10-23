import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Check, Plus } from "lucide-react"
import {
  PLAN_IDS,
  PLANS,
  PLATFORM_RULES,
  type Platform,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Monogram } from "@/components/brand"
import { PlatformIcon } from "@/components/platform-icon"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { price } from "@/features/billing/plan-cards"
import { contactHref } from "./contact"
import { agentClients, audiences, faqs, heroSummary, steps } from "./content"
import {
  ChannelsCard,
  ComposerCard,
  PLATFORM_ORDER,
  PreviewCard,
  ReplyCard,
  ResultsCard,
  ScheduleCard,
} from "./product-cards"
import {
  GetStarted,
  MarketingCta,
  MarketingPage,
  Painting,
  Pill,
  SectionHeading,
  outlineButton,
  startingPrice,
  textLink,
} from "./shell"
import { StepNav } from "./step-nav"

const container = "mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"

const heroSteps = [
  { label: "Write", card: <ComposerCard /> },
  { label: "Preview", card: <PreviewCard /> },
  { label: "Schedule", card: <ScheduleCard /> },
  { label: "Reply", card: <ReplyCard /> },
  { label: "Measure", card: <ResultsCard /> },
]

/** The product's loop, one step at a time on a painted sky. */
function HeroPanel() {
  return (
    <Painting
      tone="sky"
      className="hero-cycle flex min-h-[38rem] flex-col p-4 sm:p-10 lg:min-h-[44rem]"
    >
      <div aria-hidden="true" className="grid gap-3">
        <Pill className="text-ink/70">One post, six platforms</Pill>
        <p className="text-[clamp(2rem,3.4vw,3rem)] leading-[1.02] font-medium tracking-[-0.045em] text-[#1f3d38]">
          Write it once.
          <br />
          Post it everywhere.
        </p>
      </div>
      <div aria-hidden="true" className="relative mt-8 flex-1">
        {heroSteps.map((step, index) => (
          <div
            key={step.label}
            className="hero-step absolute inset-x-0 top-0 mx-auto max-w-md"
            style={{ "--step": index } as CSSProperties}
          >
            {step.card}
          </div>
        ))}
      </div>
      <ol
        aria-label="What aghost does with a post"
        className="mt-6 grid grid-cols-5 border border-white/25 bg-pine/80 p-1 text-[11px] backdrop-blur-sm sm:text-sm"
      >
        {heroSteps.map((step, index) => (
          <li
            key={step.label}
            className="hero-tab relative py-3 text-center"
            style={{ "--step": index } as CSSProperties}
          >
            {step.label}
          </li>
        ))}
      </ol>
    </Painting>
  )
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className={cn(
        container,
        "grid items-center gap-12 pt-10 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-16"
      )}
    >
      <div className="grid content-start gap-8">
        <p className="text-[15px] text-ink/65">
          For creators, brands and agencies
        </p>
        <h1
          id="hero-heading"
          className="text-[clamp(3rem,6.4vw,5.4rem)] leading-[0.98] font-medium tracking-[-0.055em] text-balance"
        >
          Post everywhere. Answer every comment.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-pretty text-ink/70 sm:text-xl">
          {heroSummary}
        </p>
        <div className="flex flex-wrap gap-3">
          <GetStarted />
          <Link href="/#how-it-works" className={outlineButton}>
            See how it works
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink/10 pt-6 text-sm text-ink/55">
          Publishes to
          <ul className="flex items-center gap-4 text-ink">
            {PLATFORM_ORDER.map((platform) => (
              <li key={platform}>
                <PlatformIcon
                  platform={platform}
                  size={20}
                  aria-hidden={false}
                  role="img"
                  aria-label={PLATFORM_RULES[platform].name}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <HeroPanel />
    </section>
  )
}

const formats: Record<Platform, string> = {
  instagram: "Posts, reels, carousels, stories and Trial Reels",
  facebook: "Page posts with photos or a video",
  linkedin: "Posts on your profile or company page",
  twitter: "Posts with up to four photos or a video",
  threads: "Text, photos and video",
  youtube: "Videos with a title and audience setting",
}

const stats = [
  { value: "6", text: "platforms from one post" },
  { value: "0", text: "caps on DMs or contacts, on every plan" },
  { value: "1", text: "API key for MCP and the REST API" },
]

function Platforms() {
  return (
    <section
      aria-labelledby="platforms-heading"
      className={cn(container, "mt-28")}
    >
      <h2
        id="platforms-heading"
        className="mx-auto max-w-3xl text-center text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-medium tracking-[-0.04em] text-balance"
      >
        One calendar for every channel.
      </h2>
      <ul className="mt-10 grid border-t border-l border-ink/10 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_ORDER.map((platform) => (
          <li
            key={platform}
            className="grid content-start gap-4 border-r border-b border-ink/10 p-8"
          >
            <PlatformIcon platform={platform} size={30} />
            <div className="grid gap-1">
              <h3 className="text-xl font-medium tracking-[-0.02em]">
                {PLATFORM_RULES[platform].name}
              </h3>
              <p className="text-ink/60">{formats[platform]}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-16 grid gap-10 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.text}
            className="grid gap-2 border-t border-ink/15 pt-6"
          >
            <dt className="text-6xl leading-none font-medium tracking-[-0.05em]">
              {stat.value}
            </dt>
            <dd className="text-lg text-ink/65">{stat.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** A full-width painting with the promise inked in line by line. */
function Statement() {
  const lines = [
    "Write it once.",
    "Post it everywhere.",
    "Turn every comment into a conversation.",
    "Know what worked.",
  ]
  return (
    <section aria-labelledby="statement-heading" className="mt-32">
      <Painting
        tone="dusk"
        className="flex min-h-[44rem] items-center py-24 text-white"
      >
        <div className={cn(container, "grid w-full gap-8")}>
          <Pill className="text-white/75">Why aghost</Pill>
          <h2
            id="statement-heading"
            className="max-w-5xl text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.08] font-medium tracking-[-0.045em]"
          >
            {lines.map((line) => (
              <span key={line} className="ink-in block">
                {line}
              </span>
            ))}
          </h2>
        </div>
      </Painting>
    </section>
  )
}

const stepVisuals: {
  id: string
  tone: "sky" | "gold" | "mist" | "dusk"
  picture: ReactNode
}[] = [
  {
    id: "step-connect",
    tone: "gold",
    picture: <ChannelsCard className="w-full max-w-sm" />,
  },
  {
    id: "step-write",
    tone: "sky",
    picture: <ComposerCard className="w-full max-w-md" />,
  },
  {
    id: "step-reply",
    tone: "dusk",
    picture: (
      <div className="origin-top scale-90">
        <InstagramPreview
          account={{ username: "aghost", picture: null }}
          screen="dm"
          post={null}
          keyword={null}
          commentReply={null}
          openingDm={{
            message: "Hi {{first_name}}! Tap below for the lookbook.",
            buttonLabel: "Send it",
          }}
          dmMessage="Here’s the spring lookbook ✨"
          buttons={["Open the lookbook"]}
        />
      </div>
    ),
  },
  {
    id: "step-measure",
    tone: "mist",
    picture: <ResultsCard className="w-full max-w-md" />,
  },
]

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className={cn(container, "mt-32 scroll-mt-24")}
    >
      <SectionHeading
        id="how-heading"
        eyebrow="How it works"
        title="From one draft to every feed."
        description="Connect once. Then write, preview, schedule, answer, measure."
      />
      <div className="mt-20 grid gap-12 lg:grid-cols-[13rem_1fr] lg:gap-16">
        <div className="max-lg:hidden">
          <div className="sticky top-28">
            <StepNav
              steps={steps.map((step, index) => ({
                id: stepVisuals[index]!.id,
                label: step.title,
              }))}
            />
          </div>
        </div>
        <ol className="grid gap-24">
          {steps.map((step, index) => {
            const visual = stepVisuals[index]!
            return (
              <li
                key={step.title}
                id={visual.id}
                className="grid scroll-mt-28 items-center gap-10 md:grid-cols-2"
              >
                <div className="grid content-start gap-5">
                  <p className="text-xs tracking-[0.14em] text-[#2a5a87] uppercase">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-medium tracking-[-0.04em]">
                    {step.title}
                  </h3>
                  <p className="text-lg text-ink/65">{step.text}</p>
                </div>
                <Painting
                  tone={visual.tone}
                  className="grid min-h-[26rem] place-items-center p-6 sm:p-10"
                >
                  <div
                    aria-hidden="true"
                    className="grid w-full place-items-center"
                  >
                    {visual.picture}
                  </div>
                </Painting>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

const jobGroups = [
  {
    title: "Plan",
    jobs: [
      { name: "Content calendar", usually: "Buffer" },
      { name: "Per-channel captions", usually: "Hootsuite" },
      { name: "Platform previews", usually: "Typefully" },
      { name: "Phone uploads", usually: "AirDrop" },
    ],
  },
  {
    title: "Publish",
    jobs: [
      { name: "Cross-posting", usually: "Postiz" },
      { name: "Stories and reels", usually: "Later" },
      { name: "Trial Reels", usually: "Instagram app" },
      { name: "YouTube uploads", usually: "YouTube Studio" },
    ],
  },
  {
    title: "Engage",
    jobs: [
      { name: "Comment-to-DM", usually: "ManyChat" },
      { name: "Follow-gated links", usually: "LinkDM" },
      { name: "Product carousels", usually: "CreatorFlow" },
      { name: "DM inbox", usually: "Meta Business Suite" },
    ],
  },
  {
    title: "Measure",
    jobs: [
      { name: "Channel analytics", usually: "Metricool" },
      { name: "Best posting times", usually: "Sprout Social" },
      { name: "Link clicks", usually: "Bitly" },
      { name: "DM delivery log", usually: "Spreadsheets" },
    ],
  },
]

/** Four plans, picked with radio buttons so the card needs no script. */
function PlanCard() {
  return (
    <div className="group/plans grid content-start gap-5 border-t-4 border-mist bg-[#e9f0ef] p-6 text-ink sm:p-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xl font-medium tracking-[-0.02em]">
          <Monogram className="size-7" />
          aghost
        </span>
        <span className="text-[11px] tracking-[0.14em] text-ink/55 uppercase">
          One workspace
        </span>
      </div>
      <fieldset className="grid gap-4">
        <legend className="sr-only">Plan</legend>
        <div className="grid grid-cols-4 bg-white/70 p-1 text-sm">
          {PLAN_IDS.map((id, index) => (
            <label key={id} className="relative cursor-pointer">
              <input
                type="radio"
                name="landing-plan"
                value={id}
                defaultChecked={index === 0}
                className="peer sr-only"
              />
              <span className="block py-2 text-center text-ink/60 peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-xs peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                {PLANS[id].name}
              </span>
            </label>
          ))}
        </div>
        {PLAN_IDS.map((id, index) => {
          const plan = PLANS[id]
          return (
            <div
              key={id}
              className={cn(
                "hidden gap-1",
                [
                  "group-has-[input[value=pro]:checked]/plans:grid",
                  "group-has-[input[value=growth]:checked]/plans:grid",
                  "group-has-[input[value=business]:checked]/plans:grid",
                  "group-has-[input[value=ultimate]:checked]/plans:grid",
                ][index]
              )}
            >
              <p className="flex items-baseline gap-2">
                <span className="text-6xl leading-none font-medium tracking-[-0.05em]">
                  {price(plan.prices.USD.monthly, "USD")}
                </span>
                <span className="text-ink/60">/ month</span>
              </p>
              <p className="text-sm text-ink/60">
                {plan.channels} channels. Or{" "}
                {price(Math.round(plan.prices.USD.yearly / 12), "USD")}/month
                yearly.
              </p>
            </div>
          )
        })}
      </fieldset>
      <ul className="grid gap-2 border-t border-ink/10 pt-5 text-sm text-ink/75">
        {[
          "Six platforms",
          "Instagram DM automation, no caps",
          "Analytics for every channel",
          "MCP and REST API",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
      <GetStarted className="w-full" />
    </div>
  )
}

function Jobs() {
  return (
    <section aria-labelledby="jobs-heading" className={cn(container, "mt-32")}>
      <div className="grid gap-12 bg-pine p-6 text-white sm:p-12 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-10">
          <div className="grid gap-5">
            <Pill className="text-white/65">Less stack. More posting.</Pill>
            <h2
              id="jobs-heading"
              className="text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04] font-medium tracking-[-0.045em]"
            >
              All these jobs.
              <br />
              One connected workspace.
            </h2>
            <p className="max-w-xl text-lg text-white/70">
              Replace your scheduler, DM tool and analytics app.
            </p>
          </div>
          <div className="grid gap-x-3 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
            {jobGroups.map((group, groupIndex) => (
              <div key={group.title} className="grid content-start gap-2">
                <p className="flex justify-between text-sm text-white/60">
                  {group.title}
                  <span className="tabular-nums">0{groupIndex + 1}</span>
                </p>
                <ul className="grid gap-2">
                  {group.jobs.map((job) => (
                    <li
                      key={job.name}
                      className="job-on grid min-h-22 content-between gap-3 border border-white/20 bg-mist p-3.5 text-ink"
                    >
                      <span className="flex gap-2 text-[15px]">
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0"
                        />
                        {job.name}
                      </span>
                      <span className="text-xs opacity-60">
                        Usually: {job.usually}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-sm text-white/60">
            <b className="font-medium text-white">16 jobs. One workspace.</b>{" "}
            One bill.
          </p>
        </div>
        <div className="grid content-start gap-4">
          <PlanCard />
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center justify-center gap-2 border border-white/30 text-[15px] text-white hover:bg-white/10"
          >
            Explore the plans
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Agents() {
  const nodes = agentClients.map((name) => ({ name, detail: "MCP" }))
  return (
    <section
      id="agents"
      aria-labelledby="agents-heading"
      className={cn(container, "mt-32 scroll-mt-24")}
    >
      <div className="grid border border-ink/10 lg:grid-cols-2">
        <div
          aria-hidden="true"
          className="grid content-center gap-0 bg-sage p-8 sm:p-12"
        >
          <div className="mx-auto grid w-full max-w-sm justify-items-center gap-1 border border-ink/10 bg-white px-6 py-5 text-center">
            <span className="flex items-center gap-2 text-lg font-medium">
              <Monogram className="size-6" />
              aghost
            </span>
            <span className="text-xs text-ink/55">
              Posts · Automations · Analytics · Inbox
            </span>
          </div>
          <svg
            viewBox="0 0 300 60"
            preserveAspectRatio="none"
            className="h-14 w-full text-ink/35"
          >
            <path
              d="M150 0V60M150 0C150 30 50 30 50 60M150 0C150 30 250 30 250 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="grid grid-cols-3 gap-3">
            {nodes.map((node) => (
              <div
                key={node.name}
                className="grid gap-1 border border-ink/10 bg-white px-3 py-4 text-center"
              >
                <span className="text-[15px]">{node.name}</span>
                <span className="text-[11px] text-ink/50">{node.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="grid gap-1 border border-ink/10 bg-white/50 px-3 py-4 text-center">
              <span className="text-[15px]">Your scripts</span>
              <span className="text-[11px] text-ink/50">REST API</span>
            </div>
            <div className="grid gap-1 border border-ink/10 bg-white/50 px-3 py-4 text-center">
              <span className="text-[15px]">Six platforms</span>
              <span className="text-[11px] text-ink/50">
                Connected channels
              </span>
            </div>
          </div>
        </div>
        <div className="grid content-center gap-6 bg-white/60 p-8 sm:p-12">
          <Pill>AI agents</Pill>
          <h2
            id="agents-heading"
            className="text-[clamp(2rem,3.6vw,3rem)] leading-[1.05] font-medium tracking-[-0.045em]"
          >
            Ask your agent. Review it in aghost.
          </h2>
          <p className="text-xl leading-relaxed text-ink/80">
            “Schedule this reel for Friday at 6 PM and DM the guide to everyone
            who comments GUIDE.”
          </p>
          <div className="flex gap-3 bg-sage p-4 text-ink/80">
            <Monogram className="size-6 shrink-0" />
            Scheduled the reel and prepared the automation for your review.
          </div>
          <p className="text-ink/65">
            Works with {agentClients.join(", ")} or any MCP client. Agents
            schedule Instagram posts, run automations and read analytics.
          </p>
          <Link href="/agents" className={cn(outlineButton, "w-fit")}>
            Connect your agent
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

const audienceDetails: string[][] = [
  [
    "One reel, every platform",
    "Links to every commenter",
    "Followers-only links",
  ],
  ["One launch calendar", "Product carousels in DMs", "Clicks per campaign"],
  ["Up to 100 channels", "Captions per channel", "Analytics per client"],
  ["MCP and REST", "OpenAPI document", "Scoped API keys"],
]

function Audiences() {
  const tones = ["sky", "gold", "mist", "dusk"] as const
  const pictures = [
    <ComposerCard key="creators" className="w-full max-w-md" />,
    <ScheduleCard key="brands" className="w-full max-w-xs" />,
    <ResultsCard key="agencies" className="w-full max-w-md" />,
    <ChannelsCard key="developers" className="w-full max-w-xs" />,
  ]
  return (
    <section
      aria-labelledby="audiences-heading"
      className={cn(container, "mt-32")}
    >
      <div className="group/aud grid gap-10 bg-sage p-6 sm:p-12">
        <SectionHeading
          id="audiences-heading"
          eyebrow="For your team"
          title="Built around the way you post."
          align="left"
        />
        <fieldset>
          <legend className="sr-only">Who it’s for</legend>
          <div className="flex flex-wrap gap-2">
            {audiences.map((audience, index) => (
              <label key={audience.title} className="cursor-pointer">
                <input
                  type="radio"
                  name="landing-audience"
                  value={`a${index}`}
                  defaultChecked={index === 0}
                  className="peer sr-only"
                />
                <span className="block border border-ink/15 bg-white/50 px-5 py-3 text-[15px] text-ink/70 peer-checked:border-ink peer-checked:bg-white peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                  {audience.title}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {audiences.map((audience, index) => (
          <div
            key={audience.title}
            className={cn(
              "hidden items-center gap-10 md:grid-cols-2",
              [
                "group-has-[input[value=a0]:checked]/aud:grid",
                "group-has-[input[value=a1]:checked]/aud:grid",
                "group-has-[input[value=a2]:checked]/aud:grid",
                "group-has-[input[value=a3]:checked]/aud:grid",
              ][index]
            )}
          >
            <div className="grid content-start gap-6">
              <h3 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-medium tracking-[-0.04em]">
                {audience.title}
              </h3>
              <p className="text-lg text-ink/70">{audience.text}</p>
              <ul className="grid gap-3 border-t border-ink/10 pt-6">
                {audienceDetails[index]!.map((detail) => (
                  <li key={detail} className="flex gap-3 text-ink/80">
                    <Check
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0"
                    />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
            <Painting
              tone={tones[index]!}
              className="grid min-h-[22rem] place-items-center p-8"
            >
              <div
                aria-hidden="true"
                className="grid w-full place-items-center"
              >
                {pictures[index]}
              </div>
            </Painting>
          </div>
        ))}
      </div>
    </section>
  )
}

function Pricing() {
  const pro = PLANS.pro
  return (
    <section
      aria-labelledby="pricing-heading"
      className={cn(container, "mt-32")}
    >
      <div className="grid gap-12 border border-ink/10 bg-white/55 p-6 sm:p-12 lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <h2
            id="pricing-heading"
            className="text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.04] font-medium tracking-[-0.045em]"
          >
            Start with five channels.
            <br />
            Put aghost to work.
          </h2>
          <p className="flex items-baseline gap-2">
            <span className="text-[clamp(4rem,8vw,6rem)] leading-none font-medium tracking-[-0.06em]">
              {startingPrice}
            </span>
            <span className="text-lg text-ink/60">/ month</span>
          </p>
          <p className="text-lg text-ink/60">
            Or {price(Math.round(pro.prices.USD.yearly / 12), "USD")}/month
            billed yearly.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <GetStarted />
            <Link href="/pricing" className={textLink}>
              See all plans
            </Link>
          </div>
        </div>
        <div className="grid content-start gap-4">
          <h3 className="text-2xl font-medium tracking-[-0.03em]">
            Included in every plan.
          </h3>
          <ul className="grid">
            {[
              "Instagram, Facebook, LinkedIn, X, Threads and YouTube",
              "Instagram DM automation, no caps",
              "Analytics for every channel",
              "MCP and REST API",
            ].map((item) => (
              <li
                key={item}
                className="flex gap-3 border-b border-ink/10 py-4 text-lg text-ink/80"
              >
                <Check aria-hidden="true" className="mt-1.5 size-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink/55">
            Growth adds product carousels. Business adds follow-up nudges.
            Prices in USD, taxes included.
          </p>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className={cn(
        container,
        "mt-32 grid scroll-mt-24 gap-10 lg:grid-cols-[1fr_2fr]"
      )}
    >
      <div>
        <h2
          id="faq-heading"
          className="text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-medium tracking-[-0.045em] lg:sticky lg:top-28"
        >
          Frequently asked questions
        </h2>
        <p className="mt-5 text-lg text-ink/65">
          Something else?{" "}
          <a href={contactHref()} className={textLink}>
            Email us
          </a>
          .
        </p>
      </div>
      <div className="grid content-start border-t border-ink/10">
        {faqs.map((faq) => (
          <details key={faq.question} className="group border-b border-ink/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ink [&::-webkit-details-marker]:hidden">
              <h3 className="text-lg">{faq.question}</h3>
              <Plus
                aria-hidden="true"
                className="size-5 shrink-0 text-ink/60 transition-transform group-open:rotate-45"
              />
            </summary>
            <p className="pb-6 text-ink/65">{faq.answer}</p>
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
      <Platforms />
      <Statement />
      <HowItWorks />
      <Jobs />
      <Agents />
      <Audiences />
      <Pricing />
      <Faq />
      <MarketingCta />
    </MarketingPage>
  )
}
