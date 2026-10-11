import type { MetadataRoute } from "next"
import { site } from "@/lib/site"

// Search crawlers and user-requested assistant fetchers can read public pages.
// Signed-in pages answer with noindex so crawlers can read that instruction.
// The API and the analytics relay stay out. Specific bot groups must repeat
// those restrictions: they override "*".
export default function robots(): MetadataRoute.Robots {
  const publicContent = {
    allow: ["/", "/api/mcp/skill.md"],
    disallow: ["/api/", "/relay/"],
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
