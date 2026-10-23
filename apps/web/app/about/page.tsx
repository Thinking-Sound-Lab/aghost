import type { Metadata } from "next"
import Link from "next/link"
import { Monogram } from "@/components/brand"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  Painting,
  SectionHeading,
  card,
  prose,
  section,
  textLink,
} from "@/features/marketing/shell"
import { openGraph } from "@/lib/site"

const description =
  "Why we built aghost: one post on every channel, and an answer for every comment."
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
    title: "One post, every channel",
    text: "Write once for Instagram, Facebook, LinkedIn, X, Threads and YouTube, and tune each copy for the platform it lands on.",
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
        description="One post on every channel. An answer for every comment."
      />
      <section
        className={`${section} mt-0! grid items-center gap-12 lg:grid-cols-2`}
      >
        <Painting
          tone="sky"
          className="grid aspect-square place-items-center text-ink"
        >
          <Monogram className="w-1/3" />
        </Painting>
        <div className={prose}>
          <h2>Why aghost exists</h2>
          <p className="text-2xl font-medium tracking-[-0.02em] text-ink">
            You finish a reel. Then you post it five more times and answer “send
            me the guide” under every copy.
          </p>
          <p>
            aghost does that busywork: one post to every channel, and a DM for
            everyone who comments on Instagram. Your AI agent can do it too.
          </p>
          <Link href="/features" className={`${textLink} w-fit`}>
            Explore what aghost does
          </Link>
        </div>
      </section>
      <section aria-labelledby="values-heading" className={section}>
        <SectionHeading id="values-heading" title="What we care about" />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className={`${card} grid gap-3`}>
              <h3 className="text-2xl font-medium tracking-[-0.035em]">
                {value.title}
              </h3>
              <p className="text-ink/65">{value.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={`${section} grid gap-8 lg:grid-cols-[1fr_2fr]`}>
        <h2 className="text-4xl font-medium tracking-[-0.045em]">
          Know what you’re connecting
        </h2>
        <div className={prose}>
          <p>
            aghost is an independent product. Channel connections, publishing
            and message delivery use Zernio; each platform decides which
            permissions and actions are available. You sign in through each
            platform’s own login and don’t share your passwords with aghost.
          </p>
          <p>
            Read our{" "}
            <Link href="/privacy-policy" className={textLink}>
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms-of-service" className={textLink}>
              Terms of Service
            </Link>
            , or{" "}
            <Link href="/contact" className={textLink}>
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
