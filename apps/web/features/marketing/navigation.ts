export const marketingLinks = [
  { href: "/features", label: "Features" },
  { href: "/agents", label: "AI agents" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/#faq", label: "FAQ" },
]

export const agentLinks = [
  { href: "/agents#claude-code", label: "Claude Code" },
  { href: "/agents#codex", label: "Codex" },
  { href: "/agents#cursor", label: "Cursor" },
  { href: "/agents#connection", label: "Any HTTP MCP client" },
]

export const resourceLinks = [
  { href: "/blog", label: "Guides and comparisons" },
  { href: "/instagram-dm-automation", label: "Instagram DM guide" },
  { href: "/agents#connection", label: "MCP setup" },
  { href: "/agents#rest-api", label: "REST API" },
  { href: "/api/mcp/skill.md", label: "Agent setup skill" },
]

export const legalLinks = [
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/data-deletion", label: "Data deletion" },
]

export const publicPages = [
  {
    href: "/",
    label: "Home",
    description:
      "Social media scheduling to six platforms and Instagram comment-to-DM automation",
  },
  {
    href: "/features",
    label: "Features",
    description:
      "Cross-posting, platform previews, AI agents, comment automations, analytics, and inbox tools",
  },
  {
    href: "/instagram-dm-automation",
    label: "Instagram DM automation guide",
    description:
      "How comment-to-DM automation fits into your social media workflow",
  },
  {
    href: "/blog",
    label: "Blog",
    description:
      "Instagram scheduling and DM guides, messaging limits, and tool comparisons",
  },
  {
    href: "/agents",
    label: "AI agents",
    description:
      "Social media MCP and REST API setup for Claude Code, Codex, Cursor, and other agents",
  },
  {
    href: "/about",
    label: "About",
    description: "Why we built aghost and who it is for",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "USD monthly and yearly plans, with MCP and REST API access",
  },
  {
    href: "/contact",
    label: "Contact",
    description: "Support and privacy requests",
  },
  ...legalLinks.map((link) => ({ ...link, description: link.label })),
  {
    href: "/login",
    label: "Log in or sign up",
    description: "Continue with Google",
  },
]
