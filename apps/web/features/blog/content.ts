import { bestInstagramDmAutomationTools } from "./content/best-instagram-dm-automation-tools"
import { instagramAutoReply } from "./content/instagram-auto-reply"
import { instagramDmLimits } from "./content/instagram-dm-limits"
import { aghostVsManychat } from "./content/aghost-vs-manychat"
import { aghostVsChatfuel } from "./content/aghost-vs-chatfuel"
import { howToScheduleInstagramPosts } from "./content/how-to-schedule-instagram-posts"
import type { ArticleContent } from "./content/types"
import { getArticle, type ArticleSlug } from "./catalog"

// Article bodies are only imported by the server-rendered article route.
const content = {
  "how-to-schedule-instagram-posts": howToScheduleInstagramPosts,
  "instagram-auto-reply": instagramAutoReply,
  "aghost-vs-manychat": aghostVsManychat,
  "instagram-dm-limits": instagramDmLimits,
  "best-instagram-dm-automation-tools": bestInstagramDmAutomationTools,
  "aghost-vs-chatfuel": aghostVsChatfuel,
} satisfies Record<ArticleSlug, ArticleContent>

export function getArticleContent(slug: string): ArticleContent | undefined {
  const article = getArticle(slug)
  return article ? content[article.slug] : undefined
}
