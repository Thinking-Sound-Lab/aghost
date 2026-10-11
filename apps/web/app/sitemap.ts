import type { MetadataRoute } from "next"
import { site } from "@/lib/site"
import { publicPages } from "@/features/marketing/navigation"

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((page) => ({
    url: new URL(page.href, site.url).href,
  }))
}
