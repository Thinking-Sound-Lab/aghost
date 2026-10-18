import type { Metadata } from "next"
import { ArticleGrid, FeaturedArticle } from "@/features/blog/article-cards"
import { articles, articlePath } from "@/features/blog/catalog"
import {
  Doodles,
  MarketingCta,
  MarketingPage,
  Scribble,
} from "@/features/marketing/shell"
import { openGraph, site } from "@/lib/site"

const title = "Instagram scheduling and DM automation guides"
const description =
  "Practical Instagram scheduling and DM guides: posts, Reels and Stories, auto replies, messaging rules, and direct automation tool comparisons."
const url = new URL("/blog", site.url).href

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { ...openGraph, title, description, url: "/blog" },
  twitter: { card: "summary_large_image", title, description },
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      isPartOf: { "@id": `${site.url}/#website` },
      publisher: { "@id": `${site.url}/#organization` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: articles.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: article.title,
          url: new URL(articlePath(article), site.url).href,
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: "Blog", item: url },
      ],
    },
  ],
}

const [featured, ...rest] = articles

export default function Page() {
  return (
    <MarketingPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <section aria-labelledby="blog-heading" className="relative">
        <Doodles />
        <div className="relative mx-auto max-w-4xl px-5 pt-16 pb-16 text-center sm:px-8 sm:pt-24">
          <h1
            id="blog-heading"
            className="text-5xl leading-[1.1] font-extrabold tracking-[-0.04em] text-balance sm:text-6xl"
          >
            The aghost blog: Instagram scheduling, DMs,{" "}
            <span className="whitespace-nowrap">
              <Scribble>AI agents</Scribble>,
            </span>{" "}
            and automation
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-pretty text-white/70 sm:text-xl">
            Guides for the work behind your content: scheduling a post, choosing
            a tool, delivering a requested link, and understanding Instagram’s
            rules.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {featured && <FeaturedArticle article={featured} />}
        <h2 className="mt-24 text-4xl font-extrabold tracking-[-0.035em] sm:text-5xl">
          All posts
        </h2>
        <ArticleGrid articles={rest} className="mt-10" />
      </div>
      <MarketingCta />
    </MarketingPage>
  )
}
