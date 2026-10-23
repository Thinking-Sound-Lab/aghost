import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { Monogram } from "@/components/brand"
import {
  ArticleCover,
  ArticleGrid,
  Byline,
} from "@/features/blog/article-cards"
import {
  articles,
  articleDate,
  articlePath,
  getArticle,
} from "@/features/blog/catalog"
import { getArticleContent } from "@/features/blog/content"
import { LaunchVideoPlayer } from "@/features/marketing/launch-video"
import {
  MarketingCta,
  MarketingPage,
  startingPrice,
  textLink,
} from "@/features/marketing/shell"
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
        image: new URL("/opengraph-image", site.url).href,
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
      <div className="mx-auto grid max-w-7xl gap-14 px-5 pt-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16 lg:px-12 lg:pt-16">
        <article className="min-w-0">
          <nav aria-label="Breadcrumb" className="blog-breadcrumbs">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{article.category}</span>
          </nav>
          <h1 className="mt-6 text-4xl leading-[1.05] font-medium tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.5rem]">
            {article.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-ink/65">
            {article.description}
          </p>
          <Byline article={article} linked className="mt-7 text-lg" />
          <p className="mt-2 text-sm text-ink/50">
            Checked{" "}
            <time dateTime={article.updatedAt}>
              {articleDate(article.updatedAt)}
            </time>
          </p>
          <ArticleCover article={article} className="mt-8" />
          {article.category === "Comparisons" && (
            <p className="blog-disclosure">
              We build aghost. This comparison uses public product documentation
              and our assessment of workflow fit, without hands-on performance
              rankings. Prices and availability can change.
            </p>
          )}
          <div className="blog-prose mt-10">
            <details className="blog-toc">
              <summary>In this guide</summary>
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
            </details>
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
          </div>
        </article>
        <aside className="grid content-start gap-4 lg:sticky lg:top-28 lg:self-start">
          <div className="grid gap-4 border border-ink/10 bg-sage p-6">
            <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
              <Monogram className="size-8" />
            </span>
            <p className="text-2xl leading-tight font-medium tracking-[-0.035em]">
              Post everywhere. Answer every comment.
            </p>
            <p className="text-sm text-ink/70">
              aghost schedules to six platforms and DMs your link to everyone
              who comments on Instagram. Your AI agent can set it up.
            </p>
            <ul className="grid gap-2 text-sm">
              {[
                "Instagram, Facebook, LinkedIn, X, Threads, YouTube",
                "Keyword or any-comment DM triggers",
                "Run it from Claude Code or Codex",
                "Unlimited contacts and DMs",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-1 inline-flex h-11 w-full items-center justify-center bg-ink text-[15px] font-medium text-white transition-colors outline-none hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-sage"
            >
              Start for {startingPrice}/month
            </Link>
            <Link href="/#how-it-works" className={`${textLink} text-sm`}>
              See how it works
            </Link>
          </div>
          <div className="overflow-hidden border border-ink/10 bg-white/55">
            <p className="px-4 py-3 text-sm font-medium">
              See aghost in action
            </p>
            <LaunchVideoPlayer />
          </div>
        </aside>
      </div>
      <section
        aria-labelledby="related-articles"
        className="mx-auto mt-24 max-w-7xl px-5 sm:px-8 lg:px-12"
      >
        <h2
          id="related-articles"
          className="text-[clamp(2rem,3.6vw,3rem)] font-medium tracking-[-0.045em]"
        >
          Keep reading
        </h2>
        <ArticleGrid articles={related} className="mt-10" />
        <Link href="/blog" className={`${textLink} mt-8 inline-block`}>
          Browse all posts
        </Link>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
