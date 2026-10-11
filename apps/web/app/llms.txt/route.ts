import {
  agentAbilities,
  faqs,
  features,
  steps,
} from "@/features/marketing/content"
import { site } from "@/lib/site"

export const dynamic = "force-static"

// A plain-text summary for AI assistants, in the llmstxt.org layout: a title,
// a one-paragraph summary, details without headings, then lists of links.
// Agents come first: this file is where one looks for how to connect.
const body = `# ${site.name}

> ${site.description}

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

## Pages

- [Home](${site.url}/): What ${site.name} does, how it works, and answers to common questions
- [Pricing](${site.url}/pricing): USD monthly and yearly plans, with MCP and REST API access on every plan
- [Log in or sign up](${site.url}/login): Continue with Google to open the dashboard
`

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
