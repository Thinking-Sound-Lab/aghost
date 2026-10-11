import type { Metadata } from "next"
import Link from "next/link"
import { Mascot } from "@/components/brand"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  marketingLink,
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

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="About"
        title="Meet your little ghost."
        description="A small tool for the work that piles up after you hit publish."
      />
      <section className="notebook-section notebook-two-column">
        <div className="notebook-about-photo">
          <div>
            <Mascot size={210} />
          </div>
          <p className="notebook-hand">
            Less time sending links. More time creating.
          </p>
        </div>
        <div className="notebook-prose">
          <h2 className="notebook-title">Why aghost exists.</h2>
          <p className="notebook-hand text-3xl text-black">
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
          <Link
            href="/features"
            className={`${marketingLink} mt-5 inline-block text-sm`}
          >
            Explore what aghost does
          </Link>
        </div>
      </section>
      <section className="notebook-values">
        <div className="notebook-section">
          <p className="notebook-hand notebook-section-kicker">
            Keeping it simple.
          </p>
          <h2 className="notebook-title notebook-section-heading mb-10">
            One clear job.
          </h2>
          <div className="notebook-note-grid">
            {[
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
            ].map((value) => (
              <div key={value.title} className="notebook-paper-note">
                <h3 className="notebook-title">{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="notebook-section notebook-two-column">
        <div>
          <p className="notebook-hand notebook-section-kicker">
            No mystery here.
          </p>
          <h2 className="notebook-title notebook-section-heading">
            Know what you’re connecting.
          </h2>
        </div>
        <div className="notebook-prose">
          <p>
            aghost is an independent product. Instagram connections and message
            delivery use Zernio; Instagram decides which permissions and actions
            are available. You sign in through Instagram and don’t share your
            Instagram password with aghost.
          </p>
          <p>
            Read our{" "}
            <Link href="/privacy-policy" className={marketingLink}>
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms-of-service" className={marketingLink}>
              Terms of Service
            </Link>
            , or{" "}
            <Link href="/contact" className={marketingLink}>
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
