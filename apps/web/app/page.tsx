import type { Metadata } from "next"
import { PLAN_IDS, PLANS } from "@workspace/api/contract"
import { faqs, features } from "@/features/marketing/content"
import { contactEmail } from "@/features/marketing/contact"
import { Landing } from "@/features/marketing/landing"
import { openGraph, site } from "@/lib/site"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraph, url: "/" },
}

const organization = { "@id": `${site.url}/#organization` }

// Describes what the page shows, for search engines and AI assistants.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      ...organization,
      name: site.name,
      url: site.url,
      logo: `${site.url}/mascot.png`,
      email: contactEmail,
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      url: site.url,
      description: site.description,
      inLanguage: "en",
      publisher: organization,
    },
    {
      "@type": "WebApplication",
      "@id": `${site.url}/#app`,
      name: site.name,
      url: site.url,
      description: site.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      featureList: features.map((feature) => feature.title),
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: PLANS.pro.prices.USD.monthly / 100,
        highPrice: PLANS.business.prices.USD.monthly / 100,
        offerCount: PLAN_IDS.length,
      },
      publisher: organization,
    },
    {
      "@type": "FAQPage",
      "@id": `${site.url}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Landing />
    </>
  )
}
