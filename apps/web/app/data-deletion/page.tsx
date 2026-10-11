import type { Metadata } from "next"
import Link from "next/link"
import { contactEmail, contactHref } from "@/features/marketing/contact"
import { LegalPage, type PolicySection } from "@/features/marketing/legal-page"
import { openGraph } from "@/lib/site"

const description =
  "How to disconnect Instagram, revoke agent access, and request deletion of your aghost account or personal information."

export const metadata: Metadata = {
  title: "Data deletion",
  description,
  alternates: { canonical: "/data-deletion" },
  openGraph: {
    ...openGraph,
    title: "Data deletion · aghost",
    description,
    url: "/data-deletion",
  },
}

const sections: PolicySection[] = [
  {
    id: "disconnect",
    title: "1. Stop an Instagram connection",
    content: (
      <>
        <p>
          To stop an automation, pause it in the dashboard. To remove a
          connected Instagram account, open Settings → Channels, choose the
          account, and use Disconnect. Disconnecting removes the associated
          aghost automations and the connected-account record.
        </p>
        <p>
          This does not delete your aghost sign-in, workspace, or billing
          records. It also does not remove comments or messages already
          delivered on Instagram. Those are managed on Instagram.
        </p>
        <p>
          If you cannot sign in, email{" "}
          <a href={contactHref("aghost connection removal")}>{contactEmail}</a>{" "}
          with your sign-in email and the Instagram username you want
          disconnected.
        </p>
      </>
    ),
  },
  {
    id: "revoke",
    title: "2. Remove agent access",
    content: (
      <>
        <p>
          Open Settings → API and revoke any API keys you no longer want an
          agent or script to use. A revoked key stops working on subsequent
          requests.
        </p>
        <p>
          Revoking a key does not delete your workspace or data already received
          by the agent. To remove information from a third-party AI service, use
          that provider’s privacy controls or contact it directly.
        </p>
      </>
    ),
  },
  {
    id: "request",
    title: "3. Request account or workspace deletion",
    content: (
      <>
        <p>
          Email{" "}
          <a href={contactHref("aghost data deletion request")}>
            {contactEmail}
          </a>{" "}
          with the subject “aghost data deletion request.” Where possible, send
          it from the email used to sign in.
        </p>
        <ul>
          <li>Include your sign-in email and workspace name.</li>
          <li>
            Include any connected Instagram usernames relevant to the request.
          </li>
          <li>
            Tell us whether you want your entire aghost account deleted or
            specific information removed.
          </li>
        </ul>
        <p>
          We may need to verify that you own the account before processing a
          request. We’ll explain the next steps, address connected-provider data
          where applicable, and tell you about information that must be retained
          for legal, billing, security, or dispute-resolution purposes.
        </p>
        <p>
          Backup copies may remain until the relevant backups are replaced or
          expire. Deleting aghost data does not delete your Google or Instagram
          account.
        </p>
      </>
    ),
  },
  {
    id: "audience",
    title: "4. If you commented or received a DM",
    content: (
      <>
        <p>
          You do not need an aghost account to make a request about your
          information. Email the same address with your Instagram username, the
          connected Instagram account you interacted with, and the information
          you want removed.
        </p>
        <p>
          We may need to verify your identity and work with the workspace owner
          or connection provider to locate the records. The Instagram account
          owner remains responsible for its own communications and any records
          it holds outside aghost.
        </p>
        <p>
          Do not send passwords, API keys, card details, or unrelated private
          messages.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "5. Subscription and billing records",
    content: (
      <>
        <p>
          If you have an active subscription, cancel renewal through Settings →
          Plan and Billing → Manage billing, or mention the subscription in your
          deletion request so we can help you close it. Data deletion and
          subscription cancellation are separate actions.
        </p>
        <p>
          Some payment and tax records may need to be retained by aghost or Dodo
          Payments under applicable requirements. Read the{" "}
          <Link href="/privacy-policy">Privacy Policy</Link> for how information
          is handled, or <Link href="/contact">contact us</Link> if you have
          questions.
        </p>
      </>
    ),
  },
]

export default function Page() {
  return (
    <LegalPage
      title="Data deletion"
      intro={
        <p>
          You can disconnect Instagram or revoke agent access in your dashboard.
          For account deletion or requests about personal information, email the
          aghost team using the instructions below.
        </p>
      }
      sections={sections}
    />
  )
}
