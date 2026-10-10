import type { Metadata } from "next"
import { Pricing } from "@/features/billing/pricing"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flat pricing for agent-first Instagram automation. MCP and REST API access on every plan, with unlimited contacts and DMs.",
}

export default function Page() {
  return <Pricing />
}
