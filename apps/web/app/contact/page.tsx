import type { Metadata } from "next"
import Link from "next/link"
import { Mail } from "lucide-react"
import { contactEmail, contactHref } from "@/features/marketing/contact"
import {
  MarketingPage,
  PageIntro,
  Painting,
  card,
  outlineButton,
  prose,
  section,
  textLink,
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
        title="Let’s talk"
        description="Need a hand with an automation, have a billing question, or want to share an idea? There’s a person on the other end."
      />
      <section className={`${section} mt-0! grid gap-4 lg:grid-cols-2`}>
        <Painting
          tone="dusk"
          className="grid content-start gap-5 p-8 text-white sm:p-10"
        >
          <Mail aria-hidden="true" className="size-9" />
          <h2 className="text-4xl font-medium tracking-[-0.045em]">
            Drop us a note
          </h2>
          <a
            href={contactHref()}
            className="w-fit text-xl font-medium break-all underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            {contactEmail}
          </a>
          <p className="text-lg text-white/85">
            Use this address for product support, billing issues, privacy
            questions, and requests about your personal information.
          </p>
        </Painting>
        <div className={`${card} ${prose}`}>
          <h3>A little context helps</h3>
          <p>
            Include your sign-in email, the connected account and platform, and
            what you were trying to do. If something failed, include the error
            message and when it happened.
          </p>
          <h3>Privacy and data requests</h3>
          <p>
            Email us to request access, correction, export, or deletion. If you
            interacted with an account that uses aghost, include your Instagram
            username and the account you interacted with.
          </p>
          <nav aria-label="Privacy resources" className="flex flex-wrap gap-5">
            <Link href="/privacy-policy" className={textLink}>
              Privacy Policy
            </Link>
            <Link href="/data-deletion" className={textLink}>
              Data deletion instructions
            </Link>
          </nav>
          <p className="border-t border-ink/10 pt-5">
            Keep passwords, API keys, card details, and unrelated private
            conversations out of your email. We’ll ask for only the information
            needed to help.
          </p>
        </div>
      </section>
      <section className={`${section} text-center`}>
        <h2 className="text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
          A few answers are already here
        </h2>
        <p className="mt-4 text-lg text-ink/65">
          Your agent setup and the questions we hear most.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/agents" className={outlineButton}>
            Agent setup
          </Link>
          <Link href="/#faq" className={outlineButton}>
            Read the FAQ
          </Link>
        </div>
      </section>
    </MarketingPage>
  )
}
