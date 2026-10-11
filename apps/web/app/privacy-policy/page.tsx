import type { Metadata } from "next"
import { LegalPage } from "@/features/marketing/legal-page"
import { privacySections } from "@/features/marketing/policies"
import { openGraph } from "@/lib/site"

const description =
  "How aghost processes account, Instagram, automation, inbox, billing, and AI agent data, and how to exercise your privacy choices."

export const metadata: Metadata = {
  title: "Privacy Policy",
  description,
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    ...openGraph,
    title: "Privacy Policy · aghost",
    description,
    url: "/privacy-policy",
  },
}

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          Your Instagram conversations and account information deserve clear
          answers. This policy describes what aghost processes, why it is
          needed, which providers are involved, and the choices you have.
        </p>
      }
      sections={privacySections}
    />
  )
}
