import Link from "next/link"
import { ArticleGrid } from "@/features/blog/article-cards"
import { getArticle, type ArticleSlug } from "@/features/blog/catalog"
import { SectionHeading, section, textLink } from "./shell"

export function MarketingGuides({
  title,
  description,
  slugs,
}: {
  title: string
  description: string
  slugs: readonly ArticleSlug[]
}) {
  const guides = slugs.flatMap((slug) => {
    const article = getArticle(slug)
    return article ? [article] : []
  })

  return (
    <section aria-labelledby="guides-heading" className={section}>
      <SectionHeading
        id="guides-heading"
        title={title}
        description={description}
      />
      <ArticleGrid articles={guides} className="mt-10" />
      <div className="mt-8 text-center">
        <Link href="/blog" className={textLink}>
          Browse all Instagram guides
        </Link>
      </div>
    </section>
  )
}
