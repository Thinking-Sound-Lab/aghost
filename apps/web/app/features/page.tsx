import type { Metadata } from "next"
import Link from "next/link"
import { FeatureBoard } from "@/features/marketing/feature-board"
import { Scheduling } from "@/features/marketing/scheduling"
import { MarketingGuides } from "@/features/marketing/guides"
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
  "Schedule Instagram posts, reels, carousels and stories, then deliver links from comments with DM automations, follower rules, a shared inbox and stats."
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
        title="Schedule your content. Turn comments into DMs."
        description={description}
      />
      <Scheduling className="mt-0" />
      <section aria-label="Automation features" className="mt-16">
        <h2 className="sr-only">Instagram automation features</h2>
        <FeatureBoard agentic />
        <p className="mx-auto mt-8 max-w-3xl px-5 text-center text-lg text-white/70 sm:px-8">
          Learn when to use native replies and when to trigger a DM from a
          comment in our{" "}
          <Link href="/blog/instagram-auto-reply" className={textLink}>
            Instagram auto reply guide
          </Link>
          .
        </p>
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
              aghost plan. Delivery depends on Instagram’s permissions,{" "}
              <Link href="/blog/instagram-dm-limits" className={textLink}>
                messaging windows, and rate limits
              </Link>
              . MCP and REST API access are included on every plan.
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
      <MarketingGuides
        title="Check the rules. Compare your options."
        description="Understand Instagram's messaging limits and compare automation tools before choosing your campaign workflow."
        slugs={[
          "instagram-dm-limits",
          "best-instagram-dm-automation-tools",
          "manychat-vs-chatfuel",
        ]}
      />
      <MarketingCta />
    </MarketingPage>
  )
}
