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
  title: "Social media scheduling and Instagram DM automation · aghost",
  description:
    "Schedule posts to Instagram, Facebook, LinkedIn, X, Threads and YouTube, and turn Instagram comments into DMs. Run it yourself or with your AI agent.",
}

/**
 * A page that sets `openGraph` replaces the layout's, so both start here,
 * share image included: app/opengraph-image.tsx draws it.
 */
export const openGraph = {
  type: "website",
  siteName: site.name,
  title: site.title,
  description: site.description,
  locale: "en_US",
  images: [
    {
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: "aghost: social media scheduler and Instagram DM automation",
    },
  ],
}
