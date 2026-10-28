"use client"

import { useRouter } from "next/navigation"
import { Plus, Settings2 } from "lucide-react"
import { PLATFORMS } from "@workspace/api/contract"
import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu"
import { useActiveSet, useSocialSetStore } from "@/stores/social-set-store"
import { setLimit, useWorkspaceStore } from "@/stores/workspace-store"
import { SocialSetMenu } from "./social-set-menu"

/** The social set the dashboard shows, and a way to choose another. */
export function SocialSetSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const store = useWorkspaceStore()
  const active = useActiveSet()
  const choose = useSocialSetStore((state) => state.choose)
  const router = useRouter()
  if (!active) return null
  const platforms = PLATFORMS.filter((platform) =>
    store.accounts.some(
      (account) =>
        account.socialSetId === active.id &&
        account.platform === platform &&
        account.status === "connected"
    )
  )
  const room = store.socialSets.length < setLimit(store.billing)
  function open(path: string) {
    router.push(path)
    onNavigate?.()
  }
  async function add() {
    const created = await store.createSet(
      `Social set ${store.socialSets.length + 1}`
    )
    if (!created) return
    choose(created.id)
    open("/settings#channels")
  }
  return (
    <SocialSetMenu
      name={active.name}
      value={active.id}
      sets={store.socialSets}
      platforms={platforms}
      onChoose={choose}
    >
      {room ? (
        <DropdownMenuItem disabled={store.busy} onClick={() => void add()}>
          <Plus />
          New social set
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => open("/settings#billing")}>
          <Plus />
          Upgrade for more sets
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => open("/settings#channels")}>
        <Settings2 />
        Manage social sets
      </DropdownMenuItem>
    </SocialSetMenu>
  )
}
