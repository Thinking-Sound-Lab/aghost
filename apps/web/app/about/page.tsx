import type { Metadata } from "next"
import Link from "next/link"
import { Mascot } from "@/components/brand"
import { gradients } from "@/features/marketing/feature-board"
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
import { openGraph } from "@/lib/site"

const description =
  "aghost helps creators and brands turn Instagram comments into conversations, with a dashboard and tools for AI agents."
export const metadata: Metadata = {
  title: "About",
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    ...openGraph,
    title: "About aghost",
    description,
    url: "/about",
  },
}

const values = [
  {
    title: "Built around Instagram",
    text: "For creators sharing resources, brands answering product questions, and anyone delivering a link from a post or reel.",
  },
  {
    title: "Works with your agent",
    text: "Use Claude Code, Codex, Cursor, or another HTTP MCP client. Your dashboard is there whenever you want to make a change yourself.",
  },
  {
    title: "You set the rules",
    text: "Choose your keywords, write your messages, add follower rules, and pause an automation whenever you need to.",
  },
]

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="About"
        title="About aghost"
        description="A small tool for the work that piles up after you hit publish."
      />
      <section
        className={`${section} mt-0! grid items-center gap-12 lg:grid-cols-2`}
      >
        <div
          className={`grid aspect-square place-items-center rounded-[2rem] ${gradients.green}`}
        >
          <Mascot size={260} />
        </div>
        <div className={prose}>
          <h2>Why aghost exists</h2>
          <p className="text-2xl font-semibold text-white">
            You publish a reel. Someone comments “send me the guide.” Then
            another person asks. And another.
          </p>
          <p>
            The interest is there, but getting everyone the right link turns
            into a job of its own. aghost takes care of that handoff. You choose
            the comments to respond to and the message to send. Your audience
            gets the next step in their inbox, and you get back to creating.
          </p>
          <p>
            We built it so your AI agent can do that work too. The same
            automations, inbox, contacts, and stats are available through MCP
            and the REST API.
          </p>
          <Link href="/features" className={`${textLink} w-fit text-white`}>
            Explore what aghost does
          </Link>
        </div>
      </section>
      <section aria-labelledby="values-heading" className={section}>
        <SectionHeading id="values-heading" title="One clear job" />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className={`${card} grid gap-3`}>
              <h3 className="text-2xl font-extrabold tracking-[-0.03em]">
                {value.title}
              </h3>
              <p className="text-white/70">{value.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={`${section} grid gap-8 lg:grid-cols-[1fr_2fr]`}>
        <h2 className="text-4xl font-extrabold tracking-[-0.035em]">
          Know what you’re connecting
        </h2>
        <div className={prose}>
          <p>
            aghost is an independent product. Instagram connections and message
            delivery use Zernio; Instagram decides which permissions and actions
            are available. You sign in through Instagram and don’t share your
            Instagram password with aghost.
          </p>
          <p>
            Read our{" "}
            <Link href="/privacy-policy" className={`${textLink} text-white`}>
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms-of-service" className={`${textLink} text-white`}>
              Terms of Service
            </Link>
            , or{" "}
            <Link href="/contact" className={`${textLink} text-white`}>
              contact the team
            </Link>
            .
          </p>
        </div>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
