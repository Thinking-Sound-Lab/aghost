import type { Metadata } from "next"
import Link from "next/link"
import { FeatureBoard } from "@/features/marketing/feature-board"
import { InboxScene, StatsScene } from "@/features/marketing/illustrations"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  marketingLink,
} from "@/features/marketing/shell"
import { openGraph } from "@/lib/site"

const description =
  "Deliver links from Instagram comments with keyword triggers, public replies, follower rules, a shared inbox, and automation stats."
export const metadata: Metadata = {
  title: "Instagram automation features",
  description,
  alternates: { canonical: "/features" },
  openGraph: {
    ...openGraph,
    title: "Instagram automation features · aghost",
    description,
    url: "/features",
  },
}

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="Features"
        title="Little tools. Big conversations."
        description={description}
      />
      <section className="notebook-section" aria-label="Automation features">
        <h2 className="sr-only">Instagram automation features</h2>
        <FeatureBoard />
      </section>
      <section className="notebook-section border-t border-black/20">
        <p className="notebook-hand notebook-section-kicker">
          The conversation doesn’t stop at the link.
        </p>
        <h2 className="notebook-title notebook-section-heading mb-10">
          Stay in the loop.
        </h2>
        <div className="notebook-insights">
          <div>
            <div className="notebook-preview-frame">
              <StatsScene />
              <p className="notebook-hand">Example automation stats</p>
            </div>
            <h3 className="notebook-title">See what happens next.</h3>
            <p>
              Track comments, DMs sent, and link clicks for each automation.
              Check its activity log to see messages that were sent, are waiting
              for a tap, or failed.
            </p>
          </div>
          <div>
            <div className="notebook-preview-frame">
              <InboxScene />
              <p className="notebook-hand">Example inbox view</p>
            </div>
            <h3 className="notebook-title">Pick up the conversation.</h3>
            <p>
              Read and answer Instagram conversations from one inbox. Find your
              contacts, search a conversation, and ask your agent to help with a
              reply.
            </p>
          </div>
        </div>
      </section>
      <section className="notebook-section pt-0!">
        <div className="notebook-paper-note">
          <h2 className="notebook-title text-4xl">
            A quick note before you connect.
          </h2>
          <p className="notebook-body mt-5 max-w-3xl">
            You need an Instagram Business or Creator account and an active
            aghost plan. Delivery depends on Instagram’s permissions, messaging
            windows, and rate limits. MCP and REST API access are included on
            every plan.
          </p>
          <div className="notebook-stickers mt-6">
            <Link href="/pricing" className="notebook-sticker">
              Compare plans
            </Link>
            <Link href="/#faq" className={`${marketingLink} ml-3 text-sm`}>
              Read the FAQ
            </Link>
          </div>
          <Link
            href="/instagram-dm-automation"
            className={`${marketingLink} mt-6 inline-block text-sm`}
          >
            Learn how Instagram comment-to-DM automation works
          </Link>
        </div>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
