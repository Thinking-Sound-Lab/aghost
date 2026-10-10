import { Activity } from "@/features/automations/activity"
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <Activity id={id} />
}
