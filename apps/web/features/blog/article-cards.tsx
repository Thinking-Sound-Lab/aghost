import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"
import { Monogram } from "@/components/brand"
import { Painting } from "@/features/marketing/shell"
import {
  articleDate,
  articlePath,
  type Article,
  type ArticleSlug,
} from "./catalog"

type Tone = "sky" | "dusk" | "mist" | "gold"

/**
 * Each article's cover: its subject in two short lines over one of the site's
 * paintings. Dusk is dark, so its type is white.
 */
const covers: Record<ArticleSlug, { lines: [string, string]; tone: Tone }> = {
  "how-to-schedule-instagram-posts": {
    lines: ["Instagram", "scheduling"],
    tone: "sky",
  },
  "instagram-auto-reply": { lines: ["Instagram", "auto reply"], tone: "gold" },
  "aghost-vs-manychat": { lines: ["aghost", "vs ManyChat"], tone: "dusk" },
  "instagram-dm-limits": {
    lines: ["DM limits", "7 days · 24 h"],
    tone: "mist",
  },
  "best-instagram-dm-automation-tools": {
    lines: ["6 best", "DM tools"],
    tone: "sky",
  },
  "aghost-vs-chatfuel": { lines: ["aghost", "vs Chatfuel"], tone: "dusk" },
}

/** Sized from its own width, so it reads the same as a card or a hero. */
export function ArticleCover({
  article,
  className,
}: {
  article: Article
  className?: string
}) {
  const { lines, tone } = covers[article.slug]
  const dark = tone === "dusk"
  return (
    <Painting
      tone={tone}
      className={cn(
        "@container aspect-[16/9]",
        dark ? "text-white" : "text-ink",
        className
      )}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <span className="absolute top-[5cqw] left-[5cqw] flex items-center gap-[1.4cqw] text-[2.4cqw] font-medium tracking-[0.14em] uppercase opacity-80">
          <span className="size-[1.1cqw] bg-current" />
          {article.category}
        </span>
        <p className="absolute right-[22cqw] bottom-[6cqw] left-[5cqw] text-[8.5cqw] leading-[1] font-medium tracking-[-0.05em]">
          <span className="block">{lines[0]}</span>
          <span className="block opacity-75">{lines[1]}</span>
        </p>
        <Monogram className="absolute right-[5cqw] bottom-[6cqw] w-[11cqw]" />
      </div>
    </Painting>
  )
}

/** The monogram for the editorial team, then when the article came out. */
export function Byline({
  article,
  linked = false,
  className,
}: {
  article: Article
  /** Off inside a card, which is a link already. */
  linked?: boolean
  className?: string
}) {
  const team = "aghost editorial team"
  // Measured in its own em, so the one-line layout needs room at any size.
  return (
    <div className={cn("@container", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
          <Monogram className="size-6" />
        </span>
        <div className="grid @min-[24.5em]:flex @min-[24.5em]:items-center @min-[24.5em]:gap-3">
          {linked ? (
            <Link
              href="/about"
              className="w-fit font-medium underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              {team}
            </Link>
          ) : (
            <span className="font-medium">{team}</span>
          )}
          <span
            aria-hidden="true"
            className="hidden h-4 w-px bg-ink/20 @min-[24.5em]:block"
          />
          <time dateTime={article.publishedAt} className="text-ink/60">
            {articleDate(article.publishedAt)}
          </time>
        </div>
      </div>
    </div>
  )
}

const cardLink =
  "group overflow-hidden border border-ink/10 bg-white/55 transition-colors outline-none hover:border-ink/35 focus-visible:ring-2 focus-visible:ring-ink"

/** Posts as a grid of cards: cover, title, byline, and summary. */
export function ArticleGrid({
  articles,
  className,
}: {
  articles: readonly Article[]
  className?: string
}) {
  return (
    <ul className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {articles.map((article) => (
        <li key={article.slug} className="min-w-0">
          <Link
            href={articlePath(article)}
            className={cn(cardLink, "flex h-full flex-col")}
          >
            <ArticleCover article={article} />
            <div className="grid flex-1 content-start gap-4 p-5">
              <h3 className="line-clamp-2 text-xl leading-snug font-medium tracking-[-0.02em] group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">
                {article.title}
              </h3>
              <Byline article={article} className="text-sm" />
              <p className="line-clamp-3 text-sm leading-relaxed text-ink/65">
                {article.description}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** One post across the page: its cover beside its summary. */
export function FeaturedArticle({ article }: { article: Article }) {
  return (
    <Link
      href={articlePath(article)}
      className={cn(cardLink, "grid lg:grid-cols-[1.1fr_1fr]")}
    >
      <ArticleCover article={article} className="lg:aspect-auto lg:h-full" />
      <div className="grid content-center gap-4 p-8 sm:p-10">
        <p className="flex items-center gap-2.5 text-xs font-medium tracking-[0.14em] text-ink/60 uppercase">
          <span aria-hidden="true" className="size-1.5 bg-current" />
          Featured post
        </p>
        <h2 className="line-clamp-3 text-3xl leading-tight font-medium tracking-[-0.035em]">
          {article.title}
        </h2>
        <p className="line-clamp-3 text-ink/65">{article.description}</p>
        <Byline article={article} className="mt-2" />
      </div>
    </Link>
  )
}
