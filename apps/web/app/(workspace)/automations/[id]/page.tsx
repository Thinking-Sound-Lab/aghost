import { AutomationEditor } from "@/features/automations/automation-editor"
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AutomationEditor id={id} />
}
