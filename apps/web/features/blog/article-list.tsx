import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { articlePath, type Article } from "./catalog"

export function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ul className="blog-list">
      {articles.map((article) => (
        <li key={article.slug}>
          <Link href={articlePath(article)} className="blog-list-link">
            <span className="blog-category">{article.category}</span>
            <div>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
            </div>
            <ArrowUpRight aria-hidden="true" className="blog-list-arrow" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
