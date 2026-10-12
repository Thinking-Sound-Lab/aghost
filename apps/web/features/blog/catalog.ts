export type Article = {
  slug: string
  title: string
  description: string
  category: "How to" | "Comparisons" | "Messaging rules"
  publishedAt: string
  updatedAt: string
  related: string[]
}

// Keep this small and free of article bodies: marketing navigation is also
// imported by the client-side header.
export const articles: Article[] = [
  {
    slug: "instagram-auto-reply",
    title: "Instagram auto reply: setup, examples, and comment-to-DM",
    description:
      "Set up Instagram auto replies in Meta Business Suite, choose when to use comment-to-DM automation, and adapt ready-to-use reply examples.",
    category: "How to",
    publishedAt: "2026-10-12",
    updatedAt: "2026-10-12",
    related: ["instagram-dm-limits", "best-instagram-dm-automation-tools"],
  },
  {
    slug: "manychat-pricing",
    title: "ManyChat pricing in 2026: plans, contacts, and real costs",
    description:
      "Understand ManyChat's 2026 plans, monthly versus annual billing, active-contact overages, and example costs before choosing an Instagram automation tool.",
    category: "Comparisons",
    publishedAt: "2026-10-12",
    updatedAt: "2026-10-12",
    related: ["manychat-alternatives", "manychat-vs-chatfuel"],
  },
  {
    slug: "manychat-alternatives",
    title: "5 ManyChat alternatives for Instagram automation in 2026",
    description:
      "Compare aghost, LinkDM, Chatfuel, respond.io, and Meta Business Suite as ManyChat alternatives for Instagram comments, DMs, and team conversations.",
    category: "Comparisons",
    publishedAt: "2026-10-12",
    updatedAt: "2026-10-12",
    related: ["manychat-pricing", "best-instagram-dm-automation-tools"],
  },
  {
    slug: "instagram-dm-limits",
    title: "Instagram DM limits: Meta's messaging rules explained",
    description:
      "Understand Instagram's private-reply and 24-hour messaging windows, API limits, tool allowances, and why a comment does not permit unlimited follow-ups.",
    category: "Messaging rules",
    publishedAt: "2026-10-12",
    updatedAt: "2026-10-12",
    related: ["instagram-auto-reply", "best-instagram-dm-automation-tools"],
  },
  {
    slug: "best-instagram-dm-automation-tools",
    title: "6 best Instagram DM automation tools in 2026, compared",
    description:
      "Compare Instagram DM automation tools by use case: comment-to-DM, marketing flows, AI replies, shared inboxes, pricing, and agent access.",
    category: "Comparisons",
    publishedAt: "2026-10-12",
    updatedAt: "2026-10-12",
    related: ["manychat-alternatives", "instagram-dm-limits"],
  },
  {
    slug: "manychat-vs-chatfuel",
    title: "ManyChat vs Chatfuel: which fits your Instagram workflow?",
    description:
      "Compare ManyChat and Chatfuel for Instagram automation, AI conversations, contact-based pricing, usage limits, and human handoff.",
    category: "Comparisons",
    publishedAt: "2026-10-12",
    updatedAt: "2026-10-12",
    related: ["manychat-pricing", "manychat-alternatives"],
  },
]

export function getArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug)
}

export function articlePath(article: Pick<Article, "slug">): string {
  return `/blog/${article.slug}`
}

export function articleDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}
