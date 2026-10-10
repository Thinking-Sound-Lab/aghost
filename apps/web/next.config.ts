import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // The sidebar's account row sits in the default bottom-left corner.
  devIndicators: { position: "bottom-right" },
  async rewrites() {
    const apiUrl = process.env.API_URL
    if (!apiUrl)
      throw new Error(
        "Set API_URL in the root .env. Run pnpm setup:local first."
      )
    return [
      {
        source: "/api/:path*",
        destination: `${new URL(apiUrl).origin}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
