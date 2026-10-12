import type { Metadata } from "next"
import Link from "next/link"
import { ArticleList } from "@/features/blog/article-list"
import { articles, articlePath } from "@/features/blog/catalog"
import {
  MarketingCta,
  MarketingPage,
  PageIntro,
} from "@/features/marketing/shell"
import { openGraph, site } from "@/lib/site"
import "@/features/blog/blog.css"

const title = "Instagram DM automation guides and tool comparisons"
const description =
  "Practical Instagram DM guides: auto reply setup, Meta messaging limits, ManyChat pricing and alternatives, and automation tool comparisons."
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

export default function Page() {
  return (
    <MarketingPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <PageIntro
        category="Blog"
        title="Instagram DM guides & comparisons."
        description="Instagram DM guides for the work behind your content: choosing a tool, delivering a requested link, and understanding the rules."
      />
      <nav aria-label="Article topics" className="notebook-section blog-topics">
        <a href="#how-to">Set up replies</a>
        <a href="#comparisons">Compare tools</a>
        <a href="#messaging-rules">Understand the limits</a>
      </nav>
      {[
        {
          id: "how-to",
          category: "How to",
          title: "Start with the conversation.",
        },
        {
          id: "comparisons",
          category: "Comparisons",
          title: "Find the right fit.",
        },
        {
          id: "messaging-rules",
          category: "Messaging rules",
          title: "Know the rules before you send.",
        },
      ].map((group) => (
        <section
          key={group.id}
          id={group.id}
          className="notebook-section blog-group"
        >
          <h2 className="notebook-title">{group.title}</h2>
          <ArticleList
            articles={articles.filter(
              (article) => article.category === group.category
            )}
          />
        </section>
      ))}
      <section className="notebook-section blog-editorial-note">
        <h2>From the aghost team</h2>
        <p>
          We build aghost, so we explain where it fits and where other tools may
          suit your workflow. Comparisons use vendors’ public documentation.
          Each article links its sources and shows when it was checked.
        </p>
        <Link href="/instagram-dm-automation">
          New to comment-to-DM? Start with the product guide.
        </Link>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
