import Link from "next/link"
import type { PolicySection } from "./legal-page"
import { contactEmail, contactHref } from "./contact"

export const termsSections: PolicySection[] = [
  {
    id: "service",
    title: "1. The service and these terms",
    content: (
      <>
        <p>
          aghost provides Instagram comment-to-DM automations, an inbox,
          contacts, automation statistics, and access through MCP and a REST
          API. These Terms of Service govern your use of the website and
          service. “aghost,” “we,” “us,” and “our” refer to the team providing
          this service, reachable at <a href={contactHref()}>{contactEmail}</a>.
        </p>
        <p>
          By creating an account or using the service, you agree to these terms.
          If you use aghost for an organization, you confirm that you have
          authority to act for it. You must be at least 18 years old, or the age
          of majority where you live if higher, and able to enter into a binding
          agreement.
        </p>
        <p>
          Our <Link href="/privacy-policy">Privacy Policy</Link> explains how
          personal information is handled. aghost is an independent product and
          is not endorsed by Meta, Instagram, Google, or the AI agent providers
          mentioned on this website.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "2. Your account and connected services",
    content: (
      <>
        <p>
          You are responsible for keeping your account details accurate,
          protecting your sign-in and API keys, and the activity of people and
          agents you authorize. Tell us promptly if you suspect unauthorized
          access.
        </p>
        <p>
          Only connect an Instagram account you own or are authorized to manage.
          Instagram automation requires a professional Business or Creator
          account and the permissions requested during connection. Connection
          and delivery use Zernio. Google provides sign-in; we do not ask for
          your Google or Instagram password.
        </p>
        <p>
          You must follow the terms and rules of connected platforms.
          Availability, account eligibility, permissions, messaging windows, and
          rate limits are controlled by those platforms and may change.
        </p>
      </>
    ),
  },
  {
    id: "automations-and-agents",
    title: "3. Automations and AI agents",
    content: (
      <>
        <p>
          You choose your triggers, messages, links, follower rules, and
          automation status. Review them before activating an automation.
          Turning an automation on or replying in the inbox can deliver real
          messages or public comments.
        </p>
        <p>
          A workspace API key allows an authorized agent to read workspace data
          and operate automations and the inbox. You are responsible for
          instructions you give the agent and actions taken with your key. API
          access does not add a separate approval step before every write. Keys
          can be revoked in Settings → API.
        </p>
        <p>
          AI agent services have their own terms and privacy policies. Check
          those before sharing a key or personal information with an agent, and
          review generated messages for accuracy and suitability.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable use",
    content: (
      <>
        <p>Use aghost lawfully and respect your audience. You must not:</p>
        <ul>
          <li>
            Send spam, unsolicited bulk messages, harassment, deceptive content,
            or unlawful material.
          </li>
          <li>
            Impersonate someone, infringe intellectual property, or process
            personal information without an appropriate right or permission.
          </li>
          <li>
            Bypass platform restrictions, messaging windows, rate limits, or
            access controls.
          </li>
          <li>
            Try to access another workspace, disclose another person’s
            credentials, or disrupt the service.
          </li>
          <li>
            Use the service to distribute malware, phishing links, or other
            harmful content.
          </li>
        </ul>
        <p>
          You are responsible for any notices, consents, and permissions needed
          for your interactions with commenters and contacts.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "5. Plans, payments, and cancellation",
    content: (
      <>
        <p>
          An active paid plan is required for the dashboard, REST API, and MCP.
          Available plans, account limits, and monthly or yearly charges are
          shown on the <Link href="/pricing">Pricing page</Link> and at
          checkout. Prices are in US dollars and include tax. Yearly billing is
          paid upfront.
        </p>
        <p>
          Dodo Payments provides hosted checkout and billing. Subscriptions
          renew for the selected interval until cancelled. Manage your
          subscription or cancel renewal through Settings → Plan and Billing →
          Manage billing. Cancellation takes effect as indicated in the billing
          portal; cancelling renewal does not itself request a refund.
        </p>
        <p>
          When a plan ends or becomes ineligible, access may stop and running
          automations may be paused. Restoring payment does not automatically
          turn paused automations back on. Account limits apply to plan changes.
        </p>
        <p>
          <Link href="/contact">Contact us</Link> about billing problems or
          refund requests. Nothing in these terms limits a refund or
          cancellation right required by applicable law. Any price change for an
          existing subscription will be communicated before it takes effect.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "6. Your content and our software",
    content: (
      <>
        <p>
          You retain ownership of the content you provide. You give us
          permission to process, store, and transmit it as needed to provide the
          features you request, including sharing it with the connected
          providers needed to deliver messages.
        </p>
        <p>
          You confirm that you have the rights needed to use that content and
          the links you send. The aghost software, branding, and website content
          remain the property of their respective owners. These terms grant
          access to the service, not ownership of the software or branding.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "7. Availability and third-party services",
    content: (
      <>
        <p>
          We work to keep aghost available, but cannot guarantee uninterrupted
          service, successful message delivery, link clicks, account growth, or
          continued access to a third-party integration. Platform outages,
          revoked permissions, restrictions, and changes can affect automations
          and reporting.
        </p>
        <p>
          To the extent permitted by applicable law, the service is provided as
          available, without warranties of fitness for a particular purpose or
          that it will be error-free. This does not exclude rights or warranties
          that cannot lawfully be excluded.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "8. Suspension and ending use",
    content: (
      <>
        <p>
          We may restrict or suspend access when reasonably necessary to address
          abuse, unauthorized access, non-payment, a breach of these terms, or a
          legal or platform requirement. Where practical, we will explain the
          reason and how to resolve it.
        </p>
        <p>
          You can stop using the service, pause automations, revoke keys, and
          disconnect Instagram accounts. To request deletion of your aghost
          account or workspace data, follow the{" "}
          <Link href="/data-deletion">Data deletion instructions</Link>.
          Disconnecting an account, cancelling a subscription, and deleting your
          workspace are separate actions.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "9. Responsibility and applicable rights",
    content: (
      <>
        <p>
          To the extent permitted by applicable law, we are not responsible for
          indirect or consequential losses, including lost profits,
          opportunities, or data, arising from your use of the service or
          actions by a connected platform or authorized agent.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot be excluded by
          law, or removes mandatory consumer rights, remedies, or protections
          available where you live.
        </p>
      </>
    ),
  },
  {
    id: "changes-and-contact",
    title: "10. Changes and contact",
    content: (
      <>
        <p>
          We may update these terms as the service changes. The current version
          is published here with its update date. We will provide notice of
          material changes where required and seek agreement where applicable
          law requires it.
        </p>
        <p>
          For questions about these terms, your subscription, or the service,
          email <a href={contactHref("aghost support")}>{contactEmail}</a> or
          visit our <Link href="/contact">Contact page</Link>.
        </p>
      </>
    ),
  },
]

export const privacySections: PolicySection[] = [
  {
    id: "scope",
    title: "1. Who this policy covers",
    content: (
      <>
        <p>
          This policy explains how the team providing aghost handles personal
          information when you visit the website, create an account, connect
          Instagram, or use automations, contacts, the inbox, MCP, or the REST
          API. The team is reachable at{" "}
          <a href={contactHref("aghost privacy request")}>{contactEmail}</a>.
        </p>
        <p>
          It also covers information about people interacting with an Instagram
          account connected to aghost. Workspace owners decide which automations
          to run and what messages to send. They are responsible for their own
          communications, notices, and lawful use of their audience’s
          information.
        </p>
      </>
    ),
  },
  {
    id: "information",
    title: "2. Information we process",
    content: (
      <>
        <ul>
          <li>
            <strong>Account information:</strong> Google sign-in identifiers,
            email address, and basic profile details made available during
            sign-in, along with your workspace name and identifiers.
          </li>
          <li>
            <strong>Instagram connection:</strong> account identifiers,
            username, display name, profile image, connection status, granted
            permissions, and provider references. Credentials needed for the
            integration are handled through the connection provider.
          </li>
          <li>
            <strong>Automations and interactions:</strong> selected post
            identifiers and details, keywords, message text, buttons and URLs,
            public replies, follower rules, and activity and delivery records.
          </li>
          <li>
            <strong>Contacts and inbox:</strong> participant identifiers,
            usernames or profile details, conversations, message content and
            attachments, and timestamps made available by Instagram and Zernio.
          </li>
          <li>
            <strong>Statistics:</strong> comment, DM, and link-click counts and
            delivery status made available for your automations.
          </li>
          <li>
            <strong>Billing:</strong> payment-provider customer and subscription
            identifiers, plan, currency, subscription status, billing periods,
            and payment status. Payment details are entered in Dodo’s hosted
            checkout; aghost does not collect your full card number.
          </li>
          <li>
            <strong>Access and support:</strong> API-key names, prefixes,
            hashes, permissions, creation and usage timestamps, support
            correspondence, and technical records needed to operate and secure
            the service.
          </li>
          <li>
            <strong>Product usage:</strong> pages viewed, clicks and other
            interactions, device and browser details, approximate location
            derived from your IP address, performance and error records,
            recordings of how pages are used, and actions taken in your
            workspace through the dashboard, API, or MCP. Recordings mask typed
            input and leave out Instagram users’ messages, names, and contacts.
          </li>
        </ul>
        <p>
          We do not receive your Google or Instagram password. Some information
          is stored in aghost; other information, including inbox messages and
          contacts, is fetched from connected providers when you use the
          relevant feature.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "3. How information is used",
    content: (
      <>
        <p>
          We process information to sign you in, maintain your workspace,
          connect Instagram, deliver the automations and replies you request,
          display contacts and statistics, manage subscriptions, answer support
          requests, and investigate errors or misuse.
        </p>
        <p>
          We use information only as needed for these purposes and applicable
          legal obligations. We do not sell your personal information or use
          Instagram message content for advertising.
        </p>
        <p>
          Where data-protection law requires a legal basis, processing may rely
          on providing the service under our agreement, your consent for
          optional connections, legitimate interests in operating and securing
          the service, or legal obligations. You may withdraw a permission or
          consent by disconnecting the relevant service or contacting us; this
          does not undo processing already carried out lawfully.
        </p>
      </>
    ),
  },
  {
    id: "providers",
    title: "4. Providers and information sharing",
    content: (
      <>
        <p>
          We share information needed to operate the service with the following
          types of providers:
        </p>
        <ul>
          <li>
            <strong>Google:</strong> account authentication when you choose
            Google sign-in.
          </li>
          <li>
            <strong>Meta / Instagram and Zernio:</strong> account authorization,
            connected-account data, comments, contacts, conversations, message
            delivery, and automation reporting.
          </li>
          <li>
            <strong>Supabase:</strong> authentication and storage of workspace,
            account, automation, API-key, and billing records.
          </li>
          <li>
            <strong>Dodo Payments:</strong> hosted checkout, subscriptions,
            payment processing, and the billing portal.
          </li>
          <li>
            <strong>PostHog:</strong> product analytics, session recordings, and
            error tracking, stored in the United States.
          </li>
          <li>
            <strong>
              Hosting and infrastructure providers, including Vercel and Amazon
              Web Services:
            </strong>{" "}
            serving the website and API and maintaining operational records.
          </li>
        </ul>
        <p>
          These providers process information under their own applicable terms
          and privacy policies. We may also disclose information where required
          by law, to address fraud or security threats, or as part of a business
          transfer with appropriate protections.
        </p>
        <p>
          Links and messages you configure may lead to other websites. Their
          owners are responsible for their own privacy practices.
        </p>
      </>
    ),
  },
  {
    id: "agents",
    title: "5. Information available to your AI agent",
    content: (
      <>
        <p>
          Connecting an agent through MCP or the REST API gives that agent
          access using your workspace API key. New keys allow the agent to read
          connected accounts and posts, automations and their activity,
          contacts, and inbox messages, and to manage automations and send
          replies.
        </p>
        <p>
          Your agent provider may receive and process the data returned by those
          tools under its own privacy terms, including its retention and
          model-training settings. Review those settings before connecting an
          agent. aghost does not control what a third-party agent does with data
          after receiving it.
        </p>
        <p>
          You control which agent receives a key and can revoke it in Settings →
          API. Revocation prevents subsequent access through that key; it does
          not remove information an agent has already received.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "6. Cookies and technical records",
    content: (
      <>
        <p>
          The service uses authentication cookies to keep you signed in. These
          are handled by the backend and are not readable by browser JavaScript.
          Third-party sign-in and checkout pages may use their own cookies under
          their own policies.
        </p>
        <p>
          We use PostHog to understand how the website and dashboard are used.
          It keeps an identifier in a cookie and in your browser’s local storage
          so that visits before and after you sign in are counted as yours.
        </p>
        <p>
          Hosting and API infrastructure may process IP addresses, request
          details, browser information, timestamps, and error records to deliver
          and secure the service. Blocking essential cookies may prevent sign-in
          from working.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "7. Retention and deletion",
    content: (
      <>
        <p>
          Workspace and configuration records are kept while needed to provide
          your account and connected features. We may retain limited records as
          needed for billing, legal obligations, fraud prevention, security, or
          resolving disputes. Retention also depends on the policies of
          connected providers.
        </p>
        <p>
          Disconnecting Instagram stops the connection and removes the
          associated aghost automations, but does not itself delete your Google
          sign-in, workspace, or billing records. Cancelling a subscription
          stops renewal as shown in the billing portal and does not itself
          delete data.
        </p>
        <p>
          To request deletion of your aghost account or workspace data, follow
          our <Link href="/data-deletion">Data deletion instructions</Link>. We
          may need to verify the request and explain any information we must
          retain. Copies in backups may remain until those backups are replaced
          or expire.
        </p>
      </>
    ),
  },
  {
    id: "security-and-transfers",
    title: "8. Security and international processing",
    content: (
      <>
        <p>
          Access to workspace data is checked by the backend. API keys are
          stored as hashes, and you can revoke them. We use reasonable technical
          and organizational measures to protect information, but no system can
          guarantee absolute security.
        </p>
        <p>
          Our providers may process information in countries other than your
          own. Where applicable law requires safeguards for international
          transfers, appropriate safeguards must apply. Contact us for
          information about processing relevant to your account.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "9. Your choices and privacy rights",
    content: (
      <>
        <p>
          You can edit your workspace details, pause or delete automations,
          revoke API keys, and disconnect accounts in the dashboard. For
          requests to access, correct, export, or delete personal information,
          or to object to or restrict processing,{" "}
          <Link href="/contact">contact us</Link>. Available rights depend on
          the law that applies to you.
        </p>
        <p>
          If you interacted with an Instagram account using aghost, include that
          account’s username and your own username so the request can be
          located. The workspace owner may need to help resolve requests about
          their communications. Do not send passwords, API keys, payment-card
          details, or unrelated private messages.
        </p>
        <p>
          Where applicable, you can withdraw consent and complain to your local
          data-protection authority. We may need to verify your identity before
          acting on a request.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "10. Children",
    content: (
      <p>
        aghost accounts are intended for adults who can enter into an agreement.
        We do not knowingly collect personal information from children to create
        aghost accounts. If you believe a child has provided such information,
        contact us so we can investigate and take appropriate action.
      </p>
    ),
  },
  {
    id: "updates",
    title: "11. Updates and contact",
    content: (
      <>
        <p>
          We may update this policy as features or providers change. The current
          version and update date appear on this page. We will provide notice
          and request additional consent where applicable law requires it.
        </p>
        <p>
          For privacy questions, complaints, or requests, email{" "}
          <a href={contactHref("aghost privacy request")}>{contactEmail}</a> or
          use our <Link href="/contact">Contact page</Link>. Our{" "}
          <Link href="/terms-of-service">Terms of Service</Link> explain the
          conditions for using aghost.
        </p>
      </>
    ),
  },
]
