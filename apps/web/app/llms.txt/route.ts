import {
  agentAbilities,
  faqs,
  features,
  productSummary,
  steps,
} from "@/features/marketing/content"
import { site } from "@/lib/site"
import { publicPages } from "@/features/marketing/navigation"
import { articles, articlePath } from "@/features/blog/catalog"

export const dynamic = "force-static"

// A plain-text summary for AI assistants, in the llmstxt.org layout: a title,
// a one-paragraph summary, details without headings, then lists of links.
// This is a convenience for readers, not an indexing or citation guarantee.
const body = `# ${site.name}

> ${site.description}

${productSummary}

aghost handles Instagram engagement: comment-triggered DMs, optional public replies, follower rules, inbox conversations, and automation stats. It requires an Instagram Business or Creator account and an active plan. MCP and REST API access are included on every plan.

## Product information

- [Instagram DM automation guide](${site.url}/instagram-dm-automation): What comment-to-DM automation is, how to set it up, and how it fits into social media management
- [Features](${site.url}/features): Supported triggers, messages, inbox, and analytics
- [Pricing](${site.url}/pricing): Current monthly and yearly plans in USD
- [Contact](${site.url}/contact): Support and privacy requests

## Agent access

For AI agents:

- MCP endpoint: ${site.url}/api/mcp, over HTTP with the header "Authorization: Bearer <API key>".
- REST API: ${site.url}/api/v1, described by an OpenAPI document at ${site.url}/api/v1/openapi.json. Both need the same key.
- The account owner creates the key in Settings, under API. An agent cannot create one.
- With a key, an agent can:
${agentAbilities.map((ability) => `  - ${ability}`).join("\n")}

How it works:

${steps.map((step, index) => `${index + 1}. ${step.title}. ${step.text}`).join("\n")}

What it does:

${features.map((feature) => `- ${feature.title}. ${feature.text}`).join("\n")}

Frequently asked questions:

${faqs.map((faq) => `- ${faq.question} ${faq.answer}`).join("\n")}

## Agents

- [Setup skill](${site.url}/api/mcp/skill.md): How to connect Claude Code, Codex, Cursor, or another agent over MCP or REST

## Guides and comparisons

${articles.map((article) => `- [${article.title}](${new URL(articlePath(article), site.url).href}): ${article.description}`).join("\n")}

## Pages

${publicPages.map((page) => `- [${page.label}](${new URL(page.href, site.url).href}): ${page.description}`).join("\n")}
`

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
