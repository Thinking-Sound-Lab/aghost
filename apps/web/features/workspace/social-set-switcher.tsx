"use client"

import { useRouter } from "next/navigation"
import { ChevronsUpDown, Plus, Settings2 } from "lucide-react"
import { PLATFORMS } from "@workspace/api/contract"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { PlatformIcon } from "@/components/platform-icon"
import { useActiveSet, useSocialSetStore } from "@/stores/social-set-store"
import { setLimit, useWorkspaceStore } from "@/stores/workspace-store"

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
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Social set: ${active.name}`}
        className="flex w-full items-center gap-2 rounded-md bg-card px-2.5 py-2 text-left ring-1 ring-border transition-colors outline-none hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="truncate text-sm font-medium">{active.name}</span>
          <span className="flex h-3 items-center gap-1.5 text-muted-foreground">
            {platforms.length > 0 ? (
              platforms.map((platform) => (
                <PlatformIcon key={platform} platform={platform} size={11} />
              ))
            ) : (
              <span className="text-xs">No channels yet</span>
            )}
          </span>
        </span>
        <ChevronsUpDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup value={active.id} onValueChange={choose}>
          <DropdownMenuLabel>Social sets</DropdownMenuLabel>
          {store.socialSets.map((set) => (
            <DropdownMenuRadioItem key={set.id} value={set.id}>
              <span className="truncate">{set.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
