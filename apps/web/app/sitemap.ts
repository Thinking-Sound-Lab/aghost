import type { MetadataRoute } from "next"
import { site } from "@/lib/site"
import { publicPages } from "@/features/marketing/navigation"
import { articles, articlePath } from "@/features/blog/catalog"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...publicPages.map((page) => ({
      url: new URL(page.href, site.url).href,
    })),
    ...articles.map((article) => ({
      url: new URL(articlePath(article), site.url).href,
      lastModified: article.updatedAt,
    })),
  ]
}
