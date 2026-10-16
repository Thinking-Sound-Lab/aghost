import type { Metadata } from "next"
import { Pricing } from "@/features/billing/pricing"
import { openGraph } from "@/lib/site"

const description =
  "Flat pricing for Instagram scheduling and DM automation. MCP and REST API access on every plan, with unlimited contacts and DMs."

export const metadata: Metadata = {
  title: "Pricing",
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    ...openGraph,
    title: "Pricing · aghost",
    description,
    url: "/pricing",
  },
}

export default function Page() {
  return <Pricing />
}
