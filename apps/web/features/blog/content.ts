import { bestInstagramDmAutomationTools } from "./content/best-instagram-dm-automation-tools"
import { instagramAutoReply } from "./content/instagram-auto-reply"
import { instagramDmLimits } from "./content/instagram-dm-limits"
import { manychatAlternatives } from "./content/manychat-alternatives"
import { manychatPricing } from "./content/manychat-pricing"
import { manychatVsChatfuel } from "./content/manychat-vs-chatfuel"
import type { ArticleContent } from "./content/types"
import { getArticle, type ArticleSlug } from "./catalog"

// Article bodies are only imported by the server-rendered article route.
const content = {
  "instagram-auto-reply": instagramAutoReply,
  "manychat-pricing": manychatPricing,
  "manychat-alternatives": manychatAlternatives,
  "instagram-dm-limits": instagramDmLimits,
  "best-instagram-dm-automation-tools": bestInstagramDmAutomationTools,
  "manychat-vs-chatfuel": manychatVsChatfuel,
} satisfies Record<ArticleSlug, ArticleContent>

export function getArticleContent(slug: string): ArticleContent | undefined {
  const article = getArticle(slug)
  return article ? content[article.slug] : undefined
}
