type ArticleMetadata = {
  slug: string
  title: string
  description: string
  category: "How to" | "Comparisons" | "Messaging rules"
  publishedAt: string
  updatedAt: string
  related: readonly string[]
}

// Keep this small and free of article bodies: marketing navigation is also
// imported by the client-side header.
const catalog = [
  {
    slug: "how-to-schedule-instagram-posts",
    title: "How to schedule Instagram posts, Reels, and Stories",
    description:
      "Learn how to schedule Instagram posts, Reels, carousels, and Stories, find scheduled content, and prepare a comment-to-DM campaign before publishing.",
    category: "How to",
    publishedAt: "2026-10-17",
    updatedAt: "2026-10-17",
    related: ["instagram-auto-reply", "aghost-vs-chatfuel"],
  },
  {
    slug: "instagram-auto-reply",
    title: "Instagram auto reply: setup, examples, and comment-to-DM",
    description:
      "Set up Instagram auto replies in Meta Business Suite, choose when to use comment-to-DM automation, and adapt ready-to-use reply examples.",
    category: "How to",
    publishedAt: "2026-10-12",
    updatedAt: "2026-10-13",
    related: ["instagram-dm-limits", "best-instagram-dm-automation-tools"],
  },
  {
    slug: "aghost-vs-manychat",
    title: "aghost vs ManyChat: Instagram automation compared",
    description:
      "Compare aghost and ManyChat for Instagram comment-to-DM, scheduling, product cards, follow-ups, AI-agent access, and flat versus contact-based pricing.",
    category: "Comparisons",
    publishedAt: "2026-10-18",
    updatedAt: "2026-10-18",
    related: [
      "instagram-auto-reply",
      "best-instagram-dm-automation-tools",
      "aghost-vs-chatfuel",
    ],
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
    related: ["aghost-vs-manychat", "instagram-dm-limits"],
  },
  {
    slug: "aghost-vs-chatfuel",
    title: "aghost vs Chatfuel: Instagram automation compared",
    description:
      "Compare aghost and Chatfuel for Instagram comment-to-DM, AI-agent access, customer conversations, pricing, and campaign setup.",
    category: "Comparisons",
    publishedAt: "2026-10-17",
    updatedAt: "2026-10-17",
    related: [
      "aghost-vs-manychat",
      "instagram-auto-reply",
      "how-to-schedule-instagram-posts",
    ],
  },
] as const satisfies readonly ArticleMetadata[]

export type ArticleSlug = (typeof catalog)[number]["slug"]

export type Article = Omit<ArticleMetadata, "slug" | "related"> & {
  slug: ArticleSlug
  related: readonly ArticleSlug[]
}

// Type checking rejects related links that are absent from the catalog.
export const articles: readonly Article[] = catalog

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
