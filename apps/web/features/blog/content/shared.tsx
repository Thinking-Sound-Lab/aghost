import type { ReactNode } from "react"
import { PLANS } from "@workspace/api/contract"

export const sources = {
  metaPrivateReplies:
    "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/private-replies/",
  metaMessaging:
    "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/",
  metaOverview:
    "https://developers.facebook.com/docs/instagram-platform/overview/",
  metaBusinessSuite:
    "https://www.facebook.com/business/tools/meta-business-suite",
  metaInboxAutomations:
    "https://www.facebook.com/business/help/318238182723007",
  manychatInstagram: "https://manychat.com/product/instagram",
  manychatPricing: "https://manychat.com/pricing",
  manychatEssential:
    "https://help.manychat.com/hc/en-us/articles/25800276116508-Essential-plan",
  manychatPro:
    "https://help.manychat.com/hc/en-us/articles/25800228332572-Pro-plan",
  manychatContacts:
    "https://help.manychat.com/hc/en-us/articles/25800323349020-Active-Contacts",
  manychatBusiness:
    "https://help.manychat.com/hc/en-us/articles/25800254159900-Business-plan",
  manychatAdvanced:
    "https://help.manychat.com/hc/en-us/articles/25800308984988-Advanced-plan",
  manychatPlans:
    "https://help.manychat.com/hc/en-us/articles/25800347122716-Manychat-subscription-How-to-choose-the-right-one-for-you",
  linkdm: "https://www.linkdm.com/",
  linkdmPricing: "https://www.linkdm.com/pricing",
  chatfuelInstagram: "https://chatfuel.com/instagram",
  chatfuelPricing: "https://chatfuel.com/pricing",
  chatfuelLimits: "https://limits.chatfuel.com/",
  chatfuelSdk: "https://sdk.chatfuel.com/",
  chatfuelSdkInstagram: "https://sdk.chatfuel.com/channels/instagram",
  respondInstagram: "https://respond.io/integrations/instagram",
  respondInbox: "https://respond.io/team-inbox",
  respondPricing: "https://respond.io/pricing",
  respondPricingGuide: "https://respond.io/blog/respondio-pricing",
} as const

export function Source({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return <a href={href}>{children}</a>
}

export function ComparisonTable({
  caption,
  headings,
  rows,
}: {
  caption: string
  headings: string[]
  rows: ReactNode[][]
}) {
  return (
    <div
      className="blog-table-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Product prices come from the same public contract as the pricing page.
export function aghostPrice(plan: keyof typeof PLANS = "pro"): string {
  return `$${PLANS[plan].prices.USD.monthly / 100}`
}
