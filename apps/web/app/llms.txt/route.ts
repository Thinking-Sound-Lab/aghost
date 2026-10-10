import { faqs, features, steps } from "@/features/marketing/content"
import { site } from "@/lib/site"

export const dynamic = "force-static"

// A plain-text summary for AI assistants, in the llmstxt.org layout: a title,
// a one-paragraph summary, details without headings, then lists of links.
const body = `# ${site.name}

> ${site.description}

How it works:

${steps.map((step, index) => `${index + 1}. ${step.title}. ${step.text}`).join("\n")}

What it automates:

${features.map((feature) => `- ${feature.title}. ${feature.text}`).join("\n")}

Frequently asked questions:

${faqs.map((faq) => `- ${faq.question} ${faq.answer}`).join("\n")}

## Pages

- [Home](${site.url}/): What ${site.name} does, how it works, and answers to common questions
- [Log in or sign up](${site.url}/login): Continue with Google to open the dashboard
`

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
