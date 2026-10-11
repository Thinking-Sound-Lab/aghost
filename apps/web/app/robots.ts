import type { MetadataRoute } from "next"
import { site } from "@/lib/site"

// Every crawler is welcome, including the ones that feed AI search and
// assistants. Signed-in pages answer with noindex instead of hiding here, so
// crawlers can read that instruction. The API stays out, except the public
// setup skill that an agent is told to fetch.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/mcp/skill.md"],
      disallow: "/api/",
    },
    sitemap: `${site.url}/sitemap.xml`,
  }
}
