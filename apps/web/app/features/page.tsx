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
  "Cross-post to six platforms, preview every post, turn Instagram comments into DMs and track every channel."
export const metadata: Metadata = {
  title: "Social media scheduling and DM automation features",
  description,
  alternates: { canonical: "/features" },
  openGraph: {
    ...openGraph,
    title: "Social media scheduling and DM automation features · aghost",
    description,
    url: "/features",
  },
}

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="Features"
        title="Everything between the draft and the DM"
        description={description}
      />
      <section aria-labelledby="growth-features-heading">
        <h2 id="growth-features-heading" className="sr-only">
          Features
        </h2>
        <div className="px-5 sm:px-8 lg:px-12">
          <FeatureBoard />
        </div>
      </section>
      <section className={section}>
        <div
          className={`${card} grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center`}
        >
          <div className="grid gap-4">
            <h2 className="text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
              Before you connect
            </h2>
            <p className="max-w-3xl text-lg text-ink/65">
              Every plan includes all six platforms, analytics and API access.
              DM automation needs an Instagram Business or Creator account.
            </p>
            <Link
              href="/instagram-dm-automation"
              className={`${textLink} w-fit`}
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
