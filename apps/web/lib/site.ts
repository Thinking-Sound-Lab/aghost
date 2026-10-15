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
  title: "Instagram scheduling and DM automation · aghost",
  description:
    "Schedule Instagram posts, reels, carousels and stories, and turn comments into DMs. Manage your calendar and automations from the dashboard or an AI agent.",
}

/** A page that sets `openGraph` replaces the layout's, so both start here. */
export const openGraph = {
  type: "website",
  siteName: site.name,
  title: site.title,
  description: site.description,
  locale: "en_US",
}
