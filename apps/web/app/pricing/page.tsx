import type { Metadata } from "next"
import { TRIAL_DAYS } from "@workspace/api/contract"
import { Pricing } from "@/features/billing/pricing"
import { openGraph } from "@/lib/site"

const description = `Flat USD plans by social set: one account on each of six platforms. Instagram DM automation, analytics, MCP and REST, unlimited DMs. ${TRIAL_DAYS}-day free trial.`

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
