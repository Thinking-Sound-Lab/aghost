import type { Metadata } from "next"
import { TRIAL_DAYS } from "@workspace/api/contract"
import { Pricing } from "@/features/billing/pricing"
import { applicationSchema, jsonLd } from "@/features/marketing/structured-data"
import { openGraph, site } from "@/lib/site"

const description = `Flat USD plans by social set: one account on each of six platforms. Instagram DM automation, analytics, MCP and REST, unlimited DMs. ${TRIAL_DAYS}-day free trial.`

export const metadata: Metadata = {
  title: "Pricing",
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    ...openGraph,
    title: "Pricing · aghost",
    description,
    url: "/pricing",
  },
}

// The plans and their trial, and where the page sits, for search engines and
// AI assistants.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    applicationSchema(),
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        {
          "@type": "ListItem",
          position: 2,
          name: "Pricing",
          item: `${site.url}/pricing`,
        },
      ],
    },
  ],
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <Pricing />
    </>
  )
}
