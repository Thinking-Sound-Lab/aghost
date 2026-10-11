import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/features/marketing/legal-page"
import { termsSections } from "@/features/marketing/policies"
import { openGraph } from "@/lib/site"

const description =
  "Terms for using aghost’s Instagram automations, connected accounts, AI agent tools, and paid subscriptions."

export const metadata: Metadata = {
  title: "Terms of Service",
  description,
  alternates: { canonical: "/terms-of-service" },
  openGraph: {
    ...openGraph,
    title: "Terms of Service · aghost",
    description,
    url: "/terms-of-service",
  },
}

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          Please read these terms before using aghost. They explain your
          responsibilities, how subscriptions work, and the role of connected
          platforms and agents. For how we handle personal information, read our{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      }
      sections={termsSections}
    />
  )
}
