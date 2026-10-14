import type { Metadata } from "next"
import { UploadLinkPage } from "@/features/calendar/upload-link"

export const metadata: Metadata = {
  title: "Upload for your agent",
  robots: { index: false, follow: false },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>
}) {
  const { link } = await searchParams
  return <UploadLinkPage linkId={link ?? null} />
}
