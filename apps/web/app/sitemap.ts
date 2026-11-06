import type { MetadataRoute } from "next"
import { site } from "@/lib/site"
import { publicPages } from "@/features/marketing/navigation"
import { articles, articlePath } from "@/features/blog/catalog"
import {
  agentPlatformPath,
  agentPlatforms,
} from "@/features/marketing/agent-platforms"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...publicPages.map((page) => ({
      url: new URL(page.href, site.url).href,
    })),
    ...agentPlatforms.map((page) => ({
      url: new URL(agentPlatformPath(page), site.url).href,
    })),
    ...articles.map((article) => ({
      url: new URL(articlePath(article), site.url).href,
      lastModified: article.updatedAt,
    })),
  ]
}
