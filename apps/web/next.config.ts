import type { NextConfig } from "next"

/**
 * PostHog Cloud's addresses for the project's region: events go to its
 * ingestion host, and the SDK's scripts come from its assets host.
 */
function posthogRewrites() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return []
  const region = /^https:\/\/(us|eu)\.i\.posthog\.com\/?$/.exec(
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? ""
  )?.[1]
  if (!region)
    throw new Error(
      "Set POSTHOG_HOST to https://us.i.posthog.com or https://eu.i.posthog.com."
    )
  const assets = `https://${region}-assets.i.posthog.com`
  return [
    { source: "/relay/static/:path*", destination: `${assets}/static/:path*` },
    { source: "/relay/array/:path*", destination: `${assets}/array/:path*` },
    {
      source: "/relay/:path*",
      destination: `https://${region}.i.posthog.com/:path*`,
    },
  ]
}

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // The sidebar's account row sits in the default bottom-left corner.
  devIndicators: { position: "bottom-right" },
  // PostHog's endpoints end with a slash, which a redirect would drop.
  skipTrailingSlashRedirect: true,
  // Pages where the owner approves an agent app or uploads files for an
  // agent must not be framed by another site.
  async headers() {
    return ["/authorize", "/upload"].map((source) => ({
      source,
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ],
    }))
  },
  async rewrites() {
    const apiUrl = process.env.API_URL
    if (!apiUrl)
      throw new Error(
        "Set API_URL in the root .env. Run pnpm setup:local first."
      )
    const api = new URL(apiUrl).origin
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      // OAuth discovery for MCP clients, served by the API at the app's origin.
      {
        source: "/.well-known/oauth-authorization-server",
        destination: `${api}/.well-known/oauth-authorization-server`,
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: `${api}/.well-known/oauth-protected-resource/:path*`,
      },
      ...posthogRewrites(),
    ]
  },
}

export default nextConfig
