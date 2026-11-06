import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Bot,
  Braces,
  CalendarClock,
  CalendarDays,
  ChartNoAxesColumn,
  Code,
  Eye,
  FileText,
  Film,
  Hand,
  Inbox,
  Infinity as InfinityIcon,
  KeyRound,
  LayoutGrid,
  Layers,
  Link2,
  MessageCircle,
  MessageSquareText,
  MousePointer2,
  MousePointerClick,
  PenLine,
  Plus,
  Reply,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Terminal,
  Type,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react"
import {
  AUTOMATION_LIMITS,
  PLATFORM_RULES,
  TRIAL_DAYS,
  type Platform,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { PlatformIcon } from "@/components/platform-icon"
import { ClaudeCodeApp, CodexApp, CursorApp } from "./agent-apps"
import { contactHref } from "./contact"
import { agentClients, faqs, heroSummary } from "./content"
import { DemoDashboard } from "./demo-dashboard"
import {
  InboxScene,
  Screen,
  StatsScene,
  keywordScene,
  replyScene,
  tapScene,
} from "./illustrations"
import { LandingPlans } from "./plans"
import {
  ComposerCard,
  PLATFORM_ORDER,
  PreviewCard,
  ResultsCard,
  ScheduleCard,
} from "./product-cards"
import {
  GetStarted,
  Ghost,
  Highlight,
  MarketingCta,
  MarketingPage,
  Painting,
  SectionHeading,
  card,
  outlineButton,
  textLink,
  type Tone,
} from "./shell"

const container = "mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"

/** The product's areas, as the hero's shortcuts and the sections below. */
const areas: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "publishing", label: "Publishing", icon: Send },
  { id: "automation", label: "DM automation", icon: MessageCircle },
  { id: "analytics", label: "Analytics", icon: ChartNoAxesColumn },
  { id: "agents", label: "AI agents", icon: Bot },
]

/** Where the hero's ghosts float, and how big and how out of step they are. */
const ghosts = [
  { className: "top-[30%] left-[7%] size-16", delay: "0s", tilt: "-6deg" },
  { className: "top-[13%] left-[24%] size-8", delay: "-2s", tilt: "8deg" },
  { className: "top-[40%] right-[8%] size-12", delay: "-4s", tilt: "6deg" },
  { className: "top-[10%] right-[26%] size-7", delay: "-1s", tilt: "-8deg" },
]

function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="sky rounded-[28px] pb-6 sm:pb-12"
    >
      {ghosts.map((ghost) => (
        <Ghost
          key={ghost.className}
          className={cn("ghost-float absolute max-md:hidden", ghost.className)}
          style={
            { "--delay": ghost.delay, "--tilt": ghost.tilt } as CSSProperties
          }
        />
      ))}
      <div className="relative mx-auto grid max-w-4xl justify-items-center px-5 pt-12 text-center sm:pt-16">
        <Link
          href="/features"
          className="inline-flex items-center gap-2.5 rounded-full bg-ink py-1 pr-3 pl-1 text-[13px] text-white shadow-[0_10px_24px_-12px_rgb(18_20_22/0.6)] transition-colors hover:bg-ink/90"
        >
          <span className="rounded-full bg-[linear-gradient(180deg,#ffddb4,#fdb877)] px-2 py-0.5 text-[11px] font-semibold text-ink">
            NEW
          </span>
          <span className="font-medium">Post to six platforms</span>
          <span className="text-white/60 max-sm:hidden">See what’s new</span>
          <ArrowRight aria-hidden="true" className="size-3.5 text-white/70" />
        </Link>
        <nav
          aria-label="Product areas"
          className="mt-6 inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-white/45 p-1 shadow-[0_0_0_1px_rgb(255_255_255/0.6),0_10px_30px_-18px_rgb(60_40_120/0.5)] backdrop-blur-md [scrollbar-width:none]"
        >
          {areas.map((area) => (
            <a
              key={area.id}
              href={`#${area.id}`}
              className="flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm text-ink/65 transition-colors hover:bg-white/80 hover:text-ink"
            >
              <area.icon aria-hidden="true" className="size-3.5" />
              {area.label}
            </a>
          ))}
        </nav>
        <h1
          id="hero-heading"
          className="mt-10 text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.98] font-normal tracking-[-0.035em] text-balance"
        >
          Post everywhere.{" "}
          <span className="block font-serif tracking-[-0.025em] italic">
            Answer every comment.
          </span>
        </h1>
        <p className="mt-7 max-w-xl font-serif text-lg leading-[1.55] font-light text-pretty text-ink/70 sm:text-xl">
          {heroSummary}
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <GetStarted />
          <a href="#how-it-works" className={outlineButton}>
            See how it works
            <span className="grid size-6 place-items-center rounded-full bg-ink/[0.06]">
              <ArrowDown aria-hidden="true" className="size-3.5" />
            </span>
          </a>
        </div>
        <p className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[15px] text-ink/60">
          <Sparkles aria-hidden="true" className="size-4 text-violet-500" />
          Switching from ManyChat?
          <Link href="/blog/aghost-vs-manychat" className={textLink}>
            See how we compare
          </Link>
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </p>
        <div className="mt-5 flex items-center gap-3 text-sm text-ink/55">
          Publishes to
          <ul className="flex items-center gap-3 text-ink/80">
            {PLATFORM_ORDER.map((platform) => (
              <li key={platform}>
                <PlatformIcon
                  platform={platform}
                  size={17}
                  aria-hidden={false}
                  role="img"
                  aria-label={PLATFORM_RULES[platform].name}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        aria-label="Sample dashboard"
        role="region"
        className="relative mx-auto mt-16 max-w-6xl px-3 sm:px-8"
      >
        <div className="overflow-hidden rounded-[16px] shadow-[0_0_0_1px_rgb(18_20_22/0.06),0_50px_90px_-50px_rgb(50_36_100/0.55)]">
          <DemoDashboard />
        </div>
      </div>
    </section>
  )
}

type Scene = {
  label: string
  icon: LucideIcon
  picture: ReactNode
  /** A bold lead-in and one line after it. */
  caption: [string, string]
}

/**
 * A section's three product moments in one card, taking turns on a loop.
 * Picking a tab stops on that moment; the caption below says what it shows.
 */
function SceneCycle({
  name,
  painting,
  scenes,
}: {
  name: string
  painting: "sky" | "dusk" | "mist" | "gold"
  scenes: Scene[]
}) {
  return (
    <div className="cycle mt-14">
      <div className="mx-auto max-w-[70rem] rounded-[28px] bg-linear-to-b from-(--tone-soft) to-white to-50% p-3 shadow-[0_0_0_1px_rgb(18_20_22/0.06),0_1px_2px_rgb(18_20_22/0.03),0_30px_60px_-40px_rgb(17_24_39/0.25)] sm:p-5">
        <Painting
          tone={painting}
          className="grid min-h-[26rem] place-items-center px-4 py-10 sm:min-h-[32rem] sm:px-10"
        >
          <div
            aria-hidden="true"
            className="grid w-full place-items-center *:[grid-area:1/1]"
          >
            {scenes.map((scene, index) => (
              <div
                key={scene.label}
                data-show={index}
                className="cycle-scene grid w-full place-items-center"
                style={{ "--i": index } as CSSProperties}
              >
                {scene.picture}
              </div>
            ))}
          </div>
        </Painting>
        <fieldset className="mt-4 flex justify-center">
          <legend className="sr-only">Show</legend>
          <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-white p-1.5 shadow-[0_0_0_1px_rgb(18_20_22/0.07),0_1px_2px_rgb(18_20_22/0.05),0_12px_28px_-14px_rgb(17_24_39/0.3)] [scrollbar-width:none]">
            {scenes.map((scene, index) => (
              <label key={scene.label} className="shrink-0 cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  data-pick={index}
                  className="cycle-input peer sr-only"
                />
                <span
                  data-show={index}
                  className="cycle-tab flex h-9 items-center gap-2 rounded-full px-3.5 text-sm tracking-[-0.01em] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink"
                  style={{ "--i": index } as CSSProperties}
                >
                  <scene.icon aria-hidden="true" className="size-4" />
                  {scene.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mx-auto mt-7 grid max-w-xl px-5 text-center *:[grid-area:1/1]">
        {scenes.map((scene, index) => (
          <p
            key={scene.label}
            data-show={index}
            className="cycle-caption text-[15px] leading-6 text-ink/60"
            style={{ "--i": index } as CSSProperties}
          >
            <b className="font-medium text-ink">{scene.caption[0]}</b>{" "}
            {scene.caption[1]}
          </p>
        ))}
      </div>
    </div>
  )
}

type Feature = { icon: LucideIcon; title: string; text: string }

function FeatureGrid({
  features,
  columns = 3,
}: {
  features: Feature[]
  columns?: 3 | 4
}) {
  return (
    <ul
      className={cn(
        "mx-auto mt-16 grid max-w-[70rem] gap-x-10 gap-y-9 border-t border-ink/[0.08] pt-12 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
      )}
    >
      {features.map((feature) => (
        <li key={feature.title} className="grid content-start gap-4">
          <span className="grid size-8 place-items-center rounded-[9px] bg-(--tone-soft) text-(--tone-ink) shadow-[0_0_0_1px_var(--tone-ring)]">
            <feature.icon aria-hidden="true" className="size-4" />
          </span>
          <p className="text-[15px] leading-6 text-pretty text-ink/60">
            <b className="font-medium text-ink">{feature.title}.</b>{" "}
            {feature.text}
          </p>
        </li>
      ))}
    </ul>
  )
}

function FeatureSection({
  id,
  tone,
  icon,
  eyebrow,
  title,
  description,
  painting,
  scenes,
  features,
  columns,
  children,
}: {
  id: string
  tone: Tone
  icon: LucideIcon
  eyebrow: string
  title: string
  description: ReactNode
  painting: "sky" | "dusk" | "mist" | "gold"
  scenes: Scene[]
  features: Feature[]
  columns?: 3 | 4
  children?: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(`tone-${tone}`, container, "mt-24 scroll-mt-28 sm:mt-36")}
    >
      <SectionHeading
        id={`${id}-heading`}
        tone={tone}
        icon={icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <SceneCycle name={id} painting={painting} scenes={scenes} />
      <FeatureGrid features={features} columns={columns} />
      {children}
    </section>
  )
}

function Publishing() {
  return (
    <FeatureSection
      id="publishing"
      tone="blue"
      icon={Send}
      eyebrow="Publishing"
      title="Write it once. Post it everywhere."
      description={
        <>
          One caption goes to{" "}
          <Highlight>
            Instagram, Facebook, LinkedIn, X, Threads and YouTube
          </Highlight>
          , previewed the way each feed shows it.
        </>
      }
      painting="sky"
      scenes={[
        {
          label: "Write",
          icon: PenLine,
          picture: <ComposerCard className="w-full max-w-md" />,
          caption: [
            "Synced captions.",
            "One caption for every channel, or a version for just one.",
          ],
        },
        {
          label: "Preview",
          icon: Eye,
          picture: <PreviewCard className="w-full max-w-md" />,
          caption: [
            "Platform previews.",
            "See each post the way X, LinkedIn, Instagram or YouTube shows it.",
          ],
        },
        {
          label: "Schedule",
          icon: CalendarClock,
          picture: <ScheduleCard className="w-full max-w-xs" />,
          caption: ["Scheduling.", "Pick the time and the channels."],
        },
      ]}
      features={[
        {
          icon: Layers,
          title: "Six platforms",
          text: "Instagram, Facebook, LinkedIn, X, Threads and YouTube from one post.",
        },
        {
          icon: ShieldCheck,
          title: "Checked before it posts",
          text: "Every copy is checked against its platform’s limits.",
        },
        {
          icon: CalendarDays,
          title: "One calendar",
          text: "Plan the month: posts, reels, carousels and stories.",
        },
        {
          icon: Film,
          title: "Trial Reels",
          text: "Show a reel to non-followers first.",
        },
        {
          icon: Type,
          title: "YouTube titles",
          text: "Videos get their own title, apart from the caption.",
        },
        {
          icon: MessageCircle,
          title: "DMs ready at launch",
          text: "Attach a DM automation while you schedule the post.",
        },
      ]}
    />
  )
}

function Automation() {
  return (
    <FeatureSection
      id="automation"
      tone="violet"
      icon={MessageCircle}
      eyebrow="DM automation"
      title="Turn comments into conversations."
      description={
        <>
          Attach an automation to a post or reel.{" "}
          <Highlight>Everyone who comments your keyword</Highlight> gets your
          link in their DMs.
        </>
      }
      painting="mist"
      scenes={[
        {
          label: "Comment",
          icon: MessageSquareText,
          picture: <Screen className="w-full max-w-sm">{keywordScene}</Screen>,
          caption: [
            "Keyword triggers.",
            `Up to ${AUTOMATION_LIMITS.maxKeywords} keywords, or any comment.`,
          ],
        },
        {
          label: "Reply",
          icon: Reply,
          picture: <Screen className="w-full max-w-sm">{replyScene}</Screen>,
          caption: ["Public replies.", "Everyone sees the DM is on its way."],
        },
        {
          label: "DM",
          icon: Send,
          picture: <Screen className="w-full max-w-sm">{tapScene}</Screen>,
          caption: [
            "Tap-to-open DMs.",
            "A short opener and a button. The link follows the tap.",
          ],
        },
      ]}
      features={[
        {
          icon: Link2,
          title: "Link buttons",
          text: `First names and up to ${AUTOMATION_LIMITS.maxDmButtons} link buttons per DM.`,
        },
        {
          icon: UserPlus,
          title: "Followers-only links",
          text: "Non-followers are asked to follow first.",
        },
        {
          icon: ShoppingBag,
          title: "Product carousels",
          text: "Up to 10 product cards in a DM, on Growth and up.",
        },
        {
          icon: BellRing,
          title: "Follow-up nudges",
          text: "One reminder, 30 minutes to 20 hours later, on Business.",
        },
        {
          icon: ShieldCheck,
          title: "Within Instagram’s rules",
          text: "One private reply per comment, and more only after they respond.",
        },
        {
          icon: InfinityIcon,
          title: "No caps on DMs",
          text: "Unlimited automations, contacts and DMs on every plan.",
        },
      ]}
    />
  )
}

function Analytics() {
  return (
    <FeatureSection
      id="analytics"
      tone="orange"
      icon={ChartNoAxesColumn}
      eyebrow="Analytics and inbox"
      title="Know what worked."
      description={
        <>
          Reach, views and engagement for <Highlight>every channel</Highlight>,
          and clicks for every automation.
        </>
      }
      painting="gold"
      scenes={[
        {
          label: "Channels",
          icon: ChartNoAxesColumn,
          picture: <ResultsCard className="w-full max-w-md" />,
          caption: [
            "Every channel.",
            "Reach, views and engagement, side by side.",
          ],
        },
        {
          label: "Automations",
          icon: Zap,
          picture: (
            <div className="w-full max-w-2xl">
              <StatsScene />
            </div>
          ),
          caption: [
            "Every automation.",
            "DMs sent, link clicks and a log of every message.",
          ],
        },
        {
          label: "Inbox",
          icon: Inbox,
          picture: (
            <div className="w-full max-w-2xl">
              <InboxScene />
            </div>
          ),
          caption: [
            "Inbox.",
            "Answer Instagram DMs where the automation leaves off.",
          ],
        },
      ]}
      features={[
        {
          icon: Layers,
          title: "Per social set",
          text: "Switch sets to see each brand or client on its own.",
        },
        {
          icon: MousePointerClick,
          title: "Tracked links",
          text: "Clicks on every DM button and product card.",
        },
        {
          icon: Bot,
          title: "Ask your agent",
          text: "Agents read the same analytics over MCP.",
        },
      ]}
    />
  )
}

function Agents() {
  return (
    <FeatureSection
      id="agents"
      tone="green"
      icon={Bot}
      eyebrow="AI agents"
      title="Your agent can post, reply and report."
      description={
        <>
          aghost has an MCP server and a REST API, so{" "}
          <Highlight>{agentClients.join(", ")} or any MCP client</Highlight> can
          run it for you.
        </>
      }
      painting="dusk"
      scenes={[
        {
          label: "Claude Code",
          icon: Terminal,
          picture: (
            <div className="w-full max-w-2xl">
              <ClaudeCodeApp />
            </div>
          ),
          caption: [
            "Claude Code.",
            "Schedules a launch to four channels from one request.",
          ],
        },
        {
          label: "Codex",
          icon: Code,
          picture: (
            <div className="w-full max-w-2xl">
              <CodexApp />
            </div>
          ),
          caption: ["Codex.", "Reports how the launch did on each channel."],
        },
        {
          label: "Cursor",
          icon: MousePointer2,
          picture: (
            <div className="w-full max-w-2xl">
              <CursorApp />
            </div>
          ),
          caption: [
            "Cursor.",
            "Replies to a customer in your Instagram inbox.",
          ],
        },
      ]}
      columns={4}
      features={[
        {
          icon: KeyRound,
          title: "One key",
          text: "One workspace API key for MCP and REST.",
        },
        {
          icon: FileText,
          title: "Setup skill",
          text: "One file tells your agent how to connect.",
        },
        {
          icon: Braces,
          title: "OpenAPI",
          text: "A full OpenAPI document for your own scripts.",
        },
        {
          icon: Hand,
          title: "You stay in charge",
          text: "Agents can’t create keys, change settings or connect accounts.",
        },
      ]}
    >
      <div className="mt-12 flex justify-center">
        <Link href="/agents" className={outlineButton}>
          Connect your agent
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </FeatureSection>
  )
}

function platformNote(platform: Platform): string {
  const rules = PLATFORM_RULES[platform]
  switch (platform) {
    case "instagram":
      return "Posts, reels, carousels and stories, plus DM automation and the inbox."
    case "facebook":
      return "Feed posts with text, photos or a video, or a reel."
    case "linkedin":
      return `Text, up to ${rules.maxMedia} photos, or a video.`
    case "twitter":
      return `Up to ${rules.captionMaxLength} characters and ${rules.maxMedia} photos.`
    case "threads":
      return `Up to ${rules.captionMaxLength} characters, with photos and videos together.`
    case "youtube":
      return `One video, with a title of up to ${rules.titleMaxLength} characters.`
  }
}

function Platforms() {
  return (
    <section
      id="platforms"
      aria-labelledby="platforms-heading"
      className={cn("tone-slate", container, "mt-24 scroll-mt-28 sm:mt-36")}
    >
      <SectionHeading
        id="platforms-heading"
        tone="slate"
        icon={LayoutGrid}
        eyebrow="Every platform"
        title="Six platforms. One social set."
        description={
          <>
            Connect <Highlight>one account on each platform</Highlight> to make
            a social set. Plans include 1, 2 or 10.
          </>
        }
      />
      <ul className="mx-auto mt-14 grid max-w-[70rem] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_ORDER.map((platform) => (
          <li
            key={platform}
            className={cn(card, "grid content-start gap-5 p-6")}
          >
            <div className="flex items-start justify-between">
              <span className="grid size-11 place-items-center rounded-[12px] bg-sage">
                <PlatformIcon platform={platform} size={20} />
              </span>
              {platform === "instagram" && (
                <span className="rounded-full bg-(--tone-soft) px-2.5 py-1 text-xs text-ink/60">
                  DM automation
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <h3 className="text-2xl font-normal tracking-[-0.02em]">
                {PLATFORM_RULES[platform].name}
              </h3>
              <p className="text-[15px] leading-6 text-ink/60">
                {platformNote(platform)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-3 grid max-w-[70rem] gap-3 lg:grid-cols-[1fr_1.6fr]">
        <Link
          href="/pricing"
          className={cn(
            card,
            "group grid content-between gap-10 p-6 transition-shadow hover:shadow-[0_0_0_1px_rgb(18_20_22/0.12),0_30px_60px_-40px_rgb(17_24_39/0.35)]"
          )}
        >
          <span className="flex items-start justify-between">
            <span className="flex -space-x-2">
              {PLATFORM_ORDER.slice(0, 4).map((platform) => (
                <span
                  key={platform}
                  className="grid size-9 place-items-center rounded-full bg-white shadow-[0_0_0_1px_rgb(18_20_22/0.08)]"
                >
                  <PlatformIcon platform={platform} size={15} />
                </span>
              ))}
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 text-ink/40 transition-colors group-hover:text-ink"
            />
          </span>
          <span className="grid gap-2">
            <span className="font-display text-2xl tracking-[-0.02em]">
              Up to 10 social sets
            </span>
            <span className="text-[15px] leading-6 text-ink/60">
              One per brand or client, switched from the sidebar.
            </span>
          </span>
        </Link>
        <Link
          href="/agents#rest-api"
          className={cn(
            card,
            "group grid content-start gap-5 p-6 transition-shadow hover:shadow-[0_0_0_1px_rgb(18_20_22/0.12),0_30px_60px_-40px_rgb(17_24_39/0.35)]"
          )}
        >
          <span className="flex items-start justify-between">
            <span className="grid gap-2">
              <span className="font-display text-2xl tracking-[-0.02em]">
                Built for developers
              </span>
              <span className="text-[15px] leading-6 text-ink/60">
                Schedule, automate and read analytics from MCP or REST.
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 shrink-0 text-ink/40 transition-colors group-hover:text-ink"
            />
          </span>
          <span
            aria-hidden="true"
            className="grid gap-1.5 overflow-hidden rounded-[14px] bg-sage px-4 py-3.5 font-mono text-[12.5px] leading-5 text-ink/80"
          >
            {[
              ["GET", "/api/v1/accounts"],
              ["POST", "/api/v1/scheduled-posts"],
              ["POST", "/api/v1/automations"],
            ].map(([method, path]) => (
              <span key={path} className="flex gap-3 truncate">
                <span className="w-9 shrink-0 text-ink/45">{method}</span>
                {path}
              </span>
            ))}
          </span>
        </Link>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={cn("tone-cyan", container, "mt-24 scroll-mt-28 sm:mt-36")}
    >
      <SectionHeading
        id="pricing-heading"
        tone="cyan"
        icon={Tag}
        eyebrow="Pricing"
        title="Simple, flat pricing"
        description={
          <>
            Pay per social set. Try{" "}
            <Highlight>any plan free for {TRIAL_DAYS} days</Highlight>, with all
            six platforms, analytics and API access.
          </>
        }
      />
      <LandingPlans />
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
        "mt-24 grid scroll-mt-28 gap-10 sm:mt-36 lg:grid-cols-[1fr_2fr] lg:gap-16"
      )}
    >
      <div className="self-start lg:sticky lg:top-28">
        <h2
          id="faq-heading"
          className="text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.02] font-normal tracking-[-0.03em]"
        >
          Questions? We’ve got answers.
        </h2>
        <p className="mt-5 font-serif text-lg font-light text-ink/65">
          Still stuck?{" "}
          <a href={contactHref()} className={textLink}>
            Email us
          </a>{" "}
          and a person answers.
        </p>
      </div>
      <div className="grid content-start border-t border-ink/10">
        {faqs.map((faq) => (
          <details key={faq.question} className="group border-b border-ink/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 outline-none focus-visible:ring-2 focus-visible:ring-ink [&::-webkit-details-marker]:hidden">
              <h3 className="text-lg tracking-[-0.01em]">{faq.question}</h3>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] transition-colors group-hover:bg-ink/10">
                <Plus
                  aria-hidden="true"
                  className="size-4 transition-transform group-open:rotate-45"
                />
              </span>
            </summary>
            <p className="pr-14 pb-6 text-ink/65">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/** For people moving over from a chatbot builder. */
function Compare() {
  return (
    <section
      aria-labelledby="compare-heading"
      className={cn(container, "mt-24")}
    >
      <div
        className={cn(
          card,
          "mx-auto grid max-w-[70rem] items-center gap-8 sm:p-12 lg:grid-cols-[1.5fr_1fr]"
        )}
      >
        <div>
          <h2
            id="compare-heading"
            className="text-[clamp(2rem,3.6vw,2.75rem)] leading-[1.05] font-normal tracking-[-0.03em] text-balance"
          >
            Coming from ManyChat?
          </h2>
          <p className="mt-4 max-w-lg font-serif text-lg leading-[1.55] font-light text-ink/65">
            Flat pricing, scheduling to six platforms, and an MCP server for
            your agent. See the side by side.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/blog/aghost-vs-manychat" className={outlineButton}>
            aghost vs ManyChat
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link href="/blog/aghost-vs-chatfuel" className={outlineButton}>
            vs Chatfuel
          </Link>
        </div>
      </div>
    </section>
  )
}

export function Landing() {
  return (
    <MarketingPage>
      <Hero />
      <div id="how-it-works" className="scroll-mt-28">
        <Publishing />
        <Automation />
        <Analytics />
        <Agents />
      </div>
      <Platforms />
      <Pricing />
      <Faq />
      <Compare />
      <MarketingCta />
    </MarketingPage>
  )
}
