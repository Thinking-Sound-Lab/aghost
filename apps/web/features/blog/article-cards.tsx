import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"
import { Mascot } from "@/components/brand"
import { mascotTones } from "@/features/marketing/feature-board"
import {
  articleDate,
  articlePath,
  type Article,
  type ArticleSlug,
} from "./catalog"

const tones = {
  ...mascotTones,
  ink: "bg-linear-to-br from-[#2a2a2a] to-[#121212] text-white",
}

/**
 * Each article's cover: its subject in two short lines on one of the mascot's
 * colours. The second line sits on a marker, like a highlighted headline.
 */
const covers: Record<
  ArticleSlug,
  { lines: [string, string]; tone: keyof typeof tones }
> = {
  "how-to-schedule-instagram-posts": {
    lines: ["Instagram", "scheduling"],
    tone: "blue",
  },
  "instagram-auto-reply": { lines: ["Instagram", "auto reply"], tone: "green" },
  "aghost-vs-manychat": {
    lines: ["aghost", "vs ManyChat"],
    tone: "blue",
  },
  "instagram-dm-limits": { lines: ["DM limits", "7 days · 24 h"], tone: "red" },
  "best-instagram-dm-automation-tools": {
    lines: ["6 best", "DM tools"],
    tone: "cyan",
  },
  "aghost-vs-chatfuel": { lines: ["aghost", "vs Chatfuel"], tone: "ink" },
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
  return (
    <div
      aria-hidden="true"
      className={cn(
        "@container relative aspect-[16/9] overflow-hidden",
        tones[tone],
        className
      )}
    >
      <span className="absolute top-[5cqw] left-[5cqw] rounded-full bg-black/15 px-[2.4cqw] py-[0.9cqw] text-[2.6cqw] font-bold tracking-wide uppercase">
        {article.category}
      </span>
      <p className="absolute right-[26cqw] bottom-[7cqw] left-[5cqw] text-[8cqw] leading-[1.02] font-extrabold tracking-[-0.045em] uppercase">
        <span className="block">{lines[0]}</span>
        <span
          className={cn(
            "mt-[1cqw] inline-block rounded-[1cqw] px-[1.6cqw]",
            tone === "ink" ? "bg-brand text-black" : "bg-black text-white"
          )}
        >
          {lines[1]}
        </span>
      </p>
      <Mascot
        size={320}
        className="absolute right-[3cqw] -bottom-[3cqw] h-auto w-[24cqw] rotate-6"
      />
      <span className="absolute top-[6cqw] right-[8cqw] size-[4cqw] rounded-full bg-white/80" />
      <span className="absolute top-[14cqw] right-[4cqw] size-[2.4cqw] rounded-full bg-black/25" />
    </div>
  )
}

/** The mascot for the editorial team, then when the article came out. */
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
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#262626]">
          <Mascot size={26} />
        </span>
        <div className="grid @min-[24.5em]:flex @min-[24.5em]:items-center @min-[24.5em]:gap-3">
          {linked ? (
            <Link
              href="/about"
              className="w-fit font-semibold underline decoration-white/35 underline-offset-4 hover:decoration-brand"
            >
              {team}
            </Link>
          ) : (
            <span className="font-semibold">{team}</span>
          )}
          <span
            aria-hidden="true"
            className="hidden h-4 w-px bg-white/25 @min-[24.5em]:block"
          />
          <time dateTime={article.publishedAt} className="text-white/80">
            {articleDate(article.publishedAt)}
          </time>
        </div>
      </div>
    </div>
  )
}

/** Posts as a grid of cards: cover, title, byline, and summary. */
export function ArticleGrid({
  articles,
  className,
}: {
  articles: readonly Article[]
  className?: string
}) {
  return (
    <ul className={cn("grid gap-3 md:grid-cols-2 lg:grid-cols-3", className)}>
      {articles.map((article) => (
        <li key={article.slug} className="min-w-0">
          <Link
            href={articlePath(article)}
            className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-[#161616] ring-1 ring-white/10 transition-shadow outline-none hover:ring-2 hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArticleCover article={article} />
            <div className="grid flex-1 content-start gap-4 p-5">
              <h3 className="line-clamp-2 text-xl leading-snug font-bold tracking-[-0.02em] group-hover:text-brand">
                {article.title}
              </h3>
              <Byline article={article} className="text-sm" />
              <p className="line-clamp-3 text-sm leading-relaxed text-white/70">
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
      className="group grid overflow-hidden rounded-[1.5rem] bg-[#1a1a1a] ring-1 ring-white/10 transition-shadow outline-none hover:ring-2 hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand lg:grid-cols-[1.1fr_1fr]"
    >
      <ArticleCover article={article} className="lg:aspect-auto lg:h-full" />
      <div className="grid content-center gap-4 p-8 sm:p-10">
        <p className="text-lg font-bold tracking-wide text-brand uppercase">
          Featured post
        </p>
        <h2 className="line-clamp-3 text-3xl leading-tight font-bold tracking-[-0.03em] group-hover:text-brand">
          {article.title}
        </h2>
        <p className="line-clamp-3 text-white/75">{article.description}</p>
        <Byline article={article} className="mt-2" />
      </div>
    </Link>
  )
}
