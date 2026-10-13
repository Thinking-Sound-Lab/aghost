import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArticleList } from "@/features/blog/article-list"
import {
  articles,
  articleDate,
  articlePath,
  getArticle,
} from "@/features/blog/catalog"
import { getArticleContent } from "@/features/blog/content"
import { MarketingPage } from "@/features/marketing/shell"
import { openGraph, site } from "@/lib/site"
import "@/features/blog/blog.css"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug)
  if (!article) notFound()
  const path = articlePath(article)

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: path },
    openGraph: {
      ...openGraph,
      type: "article",
      title: article.title,
      description: article.description,
      url: path,
      publishedTime: `${article.publishedAt}T00:00:00Z`,
      modifiedTime: `${article.updatedAt}T00:00:00Z`,
      authors: [new URL("/about", site.url).href],
      section: article.category,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  }
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug
  const article = getArticle(slug)
  const content = getArticleContent(slug)
  if (!article || !content) notFound()

  const url = new URL(articlePath(article), site.url).href
  const related = articles.filter((item) => article.related.includes(item.slug))
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        headline: article.title,
        description: article.description,
        datePublished: `${article.publishedAt}T00:00:00Z`,
        dateModified: `${article.updatedAt}T00:00:00Z`,
        inLanguage: "en",
        articleSection: article.category,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: {
          "@type": "Organization",
          name: "aghost editorial team",
          url: new URL("/about", site.url).href,
        },
        publisher: {
          "@type": "Organization",
          "@id": `${site.url}/#organization`,
          name: site.name,
          url: site.url,
        },
        image: new URL("/opengraph-image.png", site.url).href,
        isPartOf: { "@id": `${site.url}/blog#webpage` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${site.url}/blog`,
          },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  }

  return (
    <MarketingPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <article>
        <header className="notebook-section blog-article-header">
          <nav aria-label="Breadcrumb" className="notebook-breadcrumbs">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{article.category}</span>
          </nav>
          <span className="notebook-sticker notebook-sticker-mint">
            {article.category}
          </span>
          <h1 className="notebook-title">{article.title}</h1>
          <p className="blog-description">{article.description}</p>
          <div className="blog-byline">
            <Link href="/about">aghost editorial team</Link>
            <span>
              Published{" "}
              <time dateTime={article.publishedAt}>
                {articleDate(article.publishedAt)}
              </time>
            </span>
            <span>
              Checked{" "}
              <time dateTime={article.updatedAt}>
                {articleDate(article.updatedAt)}
              </time>
            </span>
          </div>
          {article.category === "Comparisons" && (
            <p className="blog-disclosure">
              We build aghost. This comparison uses public product documentation
              and our assessment of workflow fit, without hands-on performance
              rankings. Prices and availability can change.
            </p>
          )}
        </header>
        <div className="notebook-section blog-article-layout">
          <aside className="blog-contents">
            <nav aria-label="Table of contents">
              <h2>In this guide</h2>
              <ol>
                {content.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
                <li>
                  <a href="#questions">Frequently asked questions</a>
                </li>
              </ol>
            </nav>
          </aside>
          <div className="blog-prose">
            <div className="blog-answer">
              <p className="blog-answer-label">The quick answer</p>
              <p>{content.answer}</p>
            </div>
            {content.intro}
            {content.sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2>{section.title}</h2>
                {section.body}
              </section>
            ))}
            <section id="questions" className="blog-faqs">
              <h2>Frequently asked questions</h2>
              {content.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </section>
            <div className="blog-article-cta">
              <h2>Put a requested link in the right conversation.</h2>
              <p>
                Explore aghost’s Instagram comment-to-DM workflow, then choose
                the plan that fits your accounts.
              </p>
              <div>
                <Link href="/instagram-dm-automation">
                  Explore the workflow
                </Link>
                <Link href="/pricing">See plans and pricing</Link>
              </div>
            </div>
          </div>
        </div>
      </article>
      <section
        aria-labelledby="related-articles"
        className="notebook-section blog-related"
      >
        <h2 id="related-articles" className="notebook-title">
          Keep reading.
        </h2>
        <ArticleList articles={related} />
        <Link className="blog-back" href="/blog">
          Browse all guides
        </Link>
      </section>
    </MarketingPage>
  )
}
