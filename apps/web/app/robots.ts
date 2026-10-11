import type { MetadataRoute } from "next"
import { site } from "@/lib/site"

// Search crawlers and user-requested assistant fetchers can read public pages.
// Signed-in pages answer with noindex so crawlers can read that instruction.
// Specific bot groups must repeat the API restriction: they override "*".
export default function robots(): MetadataRoute.Robots {
  const publicContent = {
    allow: ["/", "/api/mcp/skill.md"],
    disallow: "/api/",
  }

  return {
    rules: [
      { userAgent: "*", ...publicContent },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
        ],
        ...publicContent,
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  }
}
