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
  bufferScheduling: "https://buffer.com/resources/schedule-instagram-posts/",
  bufferInstagram:
    "https://support.buffer.com/en-us/articles/using-instagram-with-buffer-YSjg2dXFV8",
  postizInstagram: "https://postiz.com/channels/instagram",
  blotatoScheduling:
    "https://help.blotato.com/blog/build-social-media-scheduler-n8n-make",
  blotatoInstagramAgent:
    "https://www.blotato.com/blog/how-to-post-to-instagram-with-claude",
  manychatInstagram: "https://manychat.com/product/instagram",
  manychatPricing: "https://manychat.com/pricing",
  manychatComments:
    "https://help.manychat.com/hc/en-us/articles/14281316989724-Instagram-Post-and-Reel-Comments-trigger",
  manychatQuickAutomation:
    "https://help.manychat.com/hc/en-us/articles/16654065283100-Quick-Automation-Auto-DM-links-from-comments",
  manychatApi:
    "https://help.manychat.com/hc/en-us/articles/14959510331420-How-to-generate-a-token-for-the-Manychat-API-and-where-to-get-parameters",
  manychatContacts:
    "https://help.manychat.com/hc/en-us/articles/25800323349020-Active-Contacts",
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
