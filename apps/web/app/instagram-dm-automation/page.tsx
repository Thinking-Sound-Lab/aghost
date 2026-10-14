import type { Metadata } from "next"
import Link from "next/link"
import { AUTOMATION_LIMITS } from "@workspace/api/contract"
import { productSummary } from "@/features/marketing/content"
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

const title = "Instagram DM automation"
const description =
  "Learn how aghost sends Instagram DMs from post and reel comments, with keyword triggers, follower rules, an inbox, and MCP access for AI agents."
const url = `${site.url}/instagram-dm-automation`

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/instagram-dm-automation" },
  openGraph: {
    ...openGraph,
    title: `${title} · aghost`,
    description,
    url: "/instagram-dm-automation",
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
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
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: site.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: url,
        },
      ],
    },
  ],
}

const steps = [
  {
    title: "Connect your account",
    text: "Sign in with Google, choose a plan, and connect an Instagram Business or Creator account through Instagram’s authorization flow.",
  },
  {
    title: "Choose the trigger",
    text: `Select one post or reel, or all of them. Match any comment or use up to ${AUTOMATION_LIMITS.maxKeywords} keywords with contains, whole-word, or exact matching.`,
  },
  {
    title: "Write your reply",
    text: `Add your DM and up to ${AUTOMATION_LIMITS.maxDmButtons} link buttons. Choose an optional public reply, opening message, or follower rule, then activate the automation.`,
  },
]

const link = `${textLink} w-fit text-white`

export default function Page() {
  return (
    <MarketingPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <PageIntro
        category={title}
        title="Instagram DM automation"
        description={productSummary}
      />
      <nav
        aria-label="More Instagram guides"
        className="mx-auto mb-12 max-w-3xl px-5 text-center text-lg text-white/70 sm:px-8"
      >
        <p>
          Planning your next campaign? Learn about{" "}
          <Link href="/blog/instagram-auto-reply" className={link}>
            Instagram auto replies
          </Link>
          ,{" "}
          <Link href="/blog/instagram-dm-limits" className={link}>
            Meta’s DM limits
          </Link>
          , or{" "}
          <Link
            href="/blog/best-instagram-dm-automation-tools"
            className={link}
          >
            compare automation tools
          </Link>
          .
        </p>
      </nav>
      <section className={`${section} mt-0! grid gap-4 lg:grid-cols-2`}>
        <div id="what-is-comment-to-dm" className={`${card} ${prose}`}>
          <h2>What is comment-to-DM automation?</h2>
          <p>
            Comment-to-DM automation sends a private Instagram message when
            someone comments on your post or reel. You choose the trigger and
            write the message in advance. For example, a comment containing
            “GUIDE” can receive a DM with a link to your resource.
          </p>
          <p>
            In aghost, an automation can cover one post or reel, or all of them.
            It can match keywords or respond to any comment. An optional public
            reply lets the commenter know to check their inbox.
          </p>
        </div>
        <div className={`${card} ${prose}`}>
          <h2>A small part of your social media workflow</h2>
          <p>
            Social media management includes planning content, publishing,
            answering your audience, and measuring results. aghost focuses on
            Instagram engagement: scheduling a post together with the automation
            that answers its comments, delivering requested links, managing DM
            conversations, and tracking automation activity.
          </p>
          <p>
            Use it alongside the tools you use for other networks. Your
            dashboard and AI agent work with the same posts, automations,
            contacts, inbox, and stats.
          </p>
        </div>
      </section>
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className={`${section} scroll-mt-24`}
      >
        <SectionHeading
          id="how-heading"
          title="How to automate Instagram DMs with aghost"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
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
      <section
        id="use-cases"
        className={`${section} grid scroll-mt-24 gap-12 lg:grid-cols-2`}
      >
        <div className={prose}>
          <h2>What can you send?</h2>
          <p>
            Creators can send a guide, checklist, or course sign-up link when
            someone asks for it in a comment. A shop can share a product page or
            discount code. A service business can send a booking link from a
            post about its work.
          </p>
          <p>
            Write a message that explains what the link is for. Personalize it
            with the commenter’s first name or username, and use the inbox to
            answer their follow-up questions.
          </p>
        </div>
        <div className={prose}>
          <h2>What can you measure?</h2>
          <p>
            Each automation shows comments, DMs sent, and link clicks. Its
            activity log shows messages that were sent, are waiting for a tap,
            or failed. These are automation metrics; a link click by itself does
            not tell you whether someone bought or signed up.
          </p>
          <Link href="/features" className={link}>
            Explore triggers, messages, and inbox features
          </Link>
        </div>
      </section>
      <section
        id="requirements"
        className={`${section} grid scroll-mt-24 gap-4 lg:grid-cols-2`}
      >
        <div className={`${card} ${prose}`}>
          <h2>What do you need to get started?</h2>
          <p>
            You need an Instagram Business or Creator account and an active
            aghost plan. Your account connects through Instagram’s own login;
            aghost does not ask for your Instagram password. Delivery depends on
            Instagram’s permissions, messaging windows, and rate limits.
          </p>
          <p>
            A follower rule can reserve your link for followers. People whose
            follow status Instagram cannot confirm receive a request to follow
            first. You can pause an automation whenever you need to.
          </p>
          <Link href="/pricing" className={link}>
            Compare monthly and yearly plans
          </Link>
        </div>
        <div className={`${card} ${prose}`}>
          <h2>Can an AI agent manage your DMs?</h2>
          <p>
            Yes. Connect Claude Code, Codex, Cursor, or another HTTP MCP client
            with a workspace API key. Agents can create and update automations,
            read stats and activity, look up contacts, and read and reply to
            inbox conversations. Scripts can use the same operations through the
            REST API.
          </p>
          <p>
            MCP and REST API access are included on every plan. The account
            owner creates and revokes keys in Settings.
          </p>
          <Link href="/agents" className={link}>
            Set up your AI agent
          </Link>
        </div>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
