import type { ReactNode } from "react"

export type ArticleContent = {
  answer: string
  intro: ReactNode
  sections: { id: string; title: string; body: ReactNode }[]
  faqs: { question: string; answer: ReactNode }[]
}
