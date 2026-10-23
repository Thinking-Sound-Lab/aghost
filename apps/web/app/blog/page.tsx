import type { Metadata } from "next"
import { ArticleGrid, FeaturedArticle } from "@/features/blog/article-cards"
import { articles, articlePath } from "@/features/blog/catalog"
import { MarketingCta, MarketingPage, Pill } from "@/features/marketing/shell"
import { openGraph, site } from "@/lib/site"

const title = "Social media scheduling and Instagram DM guides"
const description =
  "Guides to scheduling posts, Instagram DM automation, messaging rules and tool comparisons."
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
      <section
        aria-labelledby="blog-heading"
        className="mx-auto grid max-w-7xl gap-6 px-5 pt-16 pb-16 sm:px-8 sm:pt-24 lg:px-12"
      >
        <Pill>Blog</Pill>
        <h1
          id="blog-heading"
          className="max-w-4xl text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.02] font-medium tracking-[-0.05em] text-balance"
        >
          Guides for scheduling, DMs and AI agents
        </h1>
        <p className="max-w-2xl text-lg text-pretty text-ink/65 sm:text-xl">
          Scheduling, DMs, tools and Instagram’s rules.
        </p>
      </section>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {featured && <FeaturedArticle article={featured} />}
        <h2 className="mt-24 text-[clamp(2rem,3.6vw,3rem)] font-medium tracking-[-0.045em]">
          All posts
        </h2>
        <ArticleGrid articles={rest} className="mt-10" />
      </div>
      <MarketingCta />
    </MarketingPage>
  )
}
