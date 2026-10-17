import type { Metadata } from "next"
import Link from "next/link"
import { growthCta } from "@/features/marketing/content"
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
  "Schedule Instagram content, automate comment replies, track link clicks, and manage your inbox with your AI agent or the aghost dashboard."
export const metadata: Metadata = {
  title: "Instagram growth tools and AI agent features",
  description,
  alternates: { canonical: "/features" },
  openGraph: {
    ...openGraph,
    title: "Instagram growth tools and AI agent features · aghost",
    description,
    url: "/features",
  },
}

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="Features"
        title="Grow your Instagram with your AI agent"
        description={description}
      />
      <section aria-labelledby="growth-features-heading">
        <h2 id="growth-features-heading" className="sr-only">
          Instagram growth features
        </h2>
        <FeatureBoard />
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
              aghost plan. Instagram scheduling, MCP, and REST API access are
              included on every plan.
            </p>
            <p className="max-w-3xl text-lg text-white/70">
              Comment-to-DM delivery depends on Instagram’s permissions,
              messaging windows, and rate limits.
            </p>
            <Link
              href="/instagram-dm-automation"
              className={`${textLink} w-fit text-white/80`}
            >
              Learn how Instagram comment-to-DM automation works
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/agents" className={outlineButton}>
              Connect your agent
            </Link>
            <Link href="/pricing" className={outlineButton}>
              Compare plans
            </Link>
          </div>
        </div>
      </section>
      <MarketingCta {...growthCta} />
    </MarketingPage>
  )
}
