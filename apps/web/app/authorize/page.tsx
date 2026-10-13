import type { Metadata } from "next"
import { Authorize } from "@/features/oauth/authorize"

export const metadata: Metadata = {
  title: "Connect an app",
  robots: { index: false, follow: false },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ request?: string; error?: string }>
}) {
  const { request, error } = await searchParams
  return (
    <Authorize requestId={error === undefined && request ? request : null} />
  )
}
