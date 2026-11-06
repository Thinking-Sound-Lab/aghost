import type { Metadata } from "next"
import { faqs } from "@/features/marketing/content"
import { contactEmail } from "@/features/marketing/contact"
import { Landing } from "@/features/marketing/landing"
import {
  applicationSchema,
  jsonLd,
  organizationRef as organization,
} from "@/features/marketing/structured-data"
import { openGraph, site } from "@/lib/site"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraph, url: "/" },
}

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
    applicationSchema(),
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
          __html: jsonLd(structuredData),
        }}
      />
      <Landing />
    </>
  )
}
