import { Settings } from "@/features/workspace/settings"
import { billingChoice } from "@workspace/api/contract"

export const metadata = { title: "Settings" }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string }>
}) {
  return <Settings choice={billingChoice(await searchParams)} />
}
