import { bestInstagramDmAutomationTools } from "./content/best-instagram-dm-automation-tools"
import { instagramAutoReply } from "./content/instagram-auto-reply"
import { instagramDmLimits } from "./content/instagram-dm-limits"
import { manychatAlternatives } from "./content/manychat-alternatives"
import { manychatPricing } from "./content/manychat-pricing"
import { manychatVsChatfuel } from "./content/manychat-vs-chatfuel"
import type { ArticleContent } from "./content/types"

// Article bodies are only imported by the server-rendered article route.
const content: Record<string, ArticleContent> = {
  "instagram-auto-reply": instagramAutoReply,
  "manychat-pricing": manychatPricing,
  "manychat-alternatives": manychatAlternatives,
  "instagram-dm-limits": instagramDmLimits,
  "best-instagram-dm-automation-tools": bestInstagramDmAutomationTools,
  "manychat-vs-chatfuel": manychatVsChatfuel,
}

export function getArticleContent(slug: string): ArticleContent | undefined {
  return content[slug]
}
