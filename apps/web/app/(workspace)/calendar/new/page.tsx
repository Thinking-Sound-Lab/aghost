import { PostComposer } from "@/features/calendar/post-composer"

export const metadata = { title: "New post" }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  const { day } = await searchParams
  // The calendar links a day as YYYY-MM-DD.
  const valid = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
  return <PostComposer id={null} day={valid ? day : null} />
}
