"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ErrorBanner, Loading, Panel } from "@/components/interface"
import { useWorkspaceStore } from "@/stores/workspace-store"

/** Zernio sends the browser here after Instagram authorizes the connection. */
export default function Page() {
  const router = useRouter()
  const { sync, error } = useWorkspaceStore()
  useEffect(() => {
    void sync().then(() => {
      if (!useWorkspaceStore.getState().error)
        router.replace("/settings#channels")
    })
  }, [sync, router])
  return (
    <Panel className="flex-1 p-10">
      {error ? (
        <ErrorBanner message={error} retry={() => void sync()} />
      ) : (
        <Loading />
      )}
    </Panel>
  )
}
