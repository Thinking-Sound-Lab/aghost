/** The public origin: APP_URL locally, the production domain on Vercel. */
function origin(): string {
  const { APP_URL, VERCEL_PROJECT_PRODUCTION_URL } = process.env
  if (APP_URL) return new URL(APP_URL).origin
  if (VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${VERCEL_PROJECT_PRODUCTION_URL}`
  throw new Error("Set APP_URL in the root .env or the deployment environment.")
}

/** Server-only: the browser has neither variable. */
export const site = {
  name: "aghost",
  url: origin(),
  title: "Agentic DM automation for Instagram · aghost",
  description:
    "aghost is agentic DM automation for Instagram. It turns comments into DMs, and AI agents like Claude Code, Codex, and Cursor run it over MCP or a REST API.",
}

/** A page that sets `openGraph` replaces the layout's, so both start here. */
export const openGraph = {
  type: "website",
  siteName: site.name,
  title: site.title,
  description: site.description,
  locale: "en_US",
}
