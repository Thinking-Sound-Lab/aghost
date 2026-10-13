import type { Metadata } from "next"
import Link from "next/link"
import { FeatureBoard } from "@/features/marketing/feature-board"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
  card,
  outlineButton,
  section,
  textLink,
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
        title="Everything you need to turn comments into DMs"
        description={description}
      />
      <section aria-label="Automation features">
        <h2 className="sr-only">Instagram automation features</h2>
        <FeatureBoard agentic />
      </section>
      <section className={section}>
        <div
          className={`${card} grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center`}
        >
          <div className="grid gap-4">
            <h2 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
              Before you connect
            </h2>
            <p className="max-w-3xl text-lg text-white/70">
              You need an Instagram Business or Creator account and an active
              aghost plan. Delivery depends on Instagram’s permissions,
              messaging windows, and rate limits. MCP and REST API access are
              included on every plan.
            </p>
            <Link
              href="/instagram-dm-automation"
              className={`${textLink} w-fit text-white/80`}
            >
              Learn how Instagram comment-to-DM automation works
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/pricing" className={outlineButton}>
              Compare plans
            </Link>
            <Link href="/#faq" className={outlineButton}>
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
