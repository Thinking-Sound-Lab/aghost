import type { Metadata } from "next"
import Link from "next/link"
import { Mail } from "lucide-react"
import { contactEmail, contactHref } from "@/features/marketing/contact"
import {
  MarketingPage,
  PageIntro,
  marketingLink,
  Smiley,
} from "@/features/marketing/shell"
import { openGraph } from "@/lib/site"

const description =
  "Contact aghost for product help, billing questions, privacy requests, or feedback."
export const metadata: Metadata = {
  title: "Contact",
  description,
  alternates: { canonical: "/contact" },
  openGraph: {
    ...openGraph,
    title: "Contact · aghost",
    description,
    url: "/contact",
  },
}

export default function Page() {
  return (
    <MarketingPage>
      <PageIntro
        category="Contact"
        title="Let’s talk."
        description="Need a hand with an automation, have a billing question, or want to share an idea? There’s a person on the other end."
      />
      <section className="notebook-section notebook-two-column notebook-contact-layout">
        <div className="notebook-paper-note notebook-contact-note">
          <Mail aria-hidden="true" className="mb-6 size-7" />
          <h2 className="notebook-title">Drop us a note.</h2>
          <a href={contactHref()} className={marketingLink}>
            {contactEmail}
          </a>
          <p>
            Use this address for product support, billing issues, privacy
            questions, and requests about your personal information.
          </p>
          <p className="notebook-hand mt-6 text-3xl">
            We’d love to hear from you.
          </p>
        </div>
        <div className="notebook-contact-guide">
          <div>
            <h2>A little context helps.</h2>
            <p>
              Include your sign-in email, the connected Instagram username, and
              what you were trying to do. If something failed, include the error
              message and when it happened.
            </p>
          </div>
          <div>
            <h2>Privacy and data requests.</h2>
            <p>
              Email us to request access, correction, export, or deletion. If
              you interacted with an account that uses aghost, include your
              Instagram username and the account you interacted with.
            </p>
            <nav aria-label="Privacy resources">
              <Link href="/privacy-policy" className={marketingLink}>
                Privacy Policy
              </Link>
              <Link href="/data-deletion" className={marketingLink}>
                Data deletion instructions
              </Link>
            </nav>
          </div>
          <p className="border-t border-black/20 pt-6">
            Keep passwords, API keys, card details, and unrelated private
            conversations out of your email. We’ll ask for only the information
            needed to help.
          </p>
        </div>
      </section>
      <section className="notebook-section border-t border-black/20 text-center">
        <div className="flex justify-center">
          <Smiley />
        </div>
        <h2 className="notebook-title text-5xl">
          A few answers are already here.
        </h2>
        <p className="notebook-hand mt-4 text-2xl">
          Your agent setup and the questions we hear most.
        </p>
        <div className="mt-6 flex justify-center gap-6 text-sm">
          <Link href="/agents" className={marketingLink}>
            Agent setup
          </Link>
          <Link href="/#faq" className={marketingLink}>
            Read the FAQ
          </Link>
        </div>
      </section>
    </MarketingPage>
  )
}
