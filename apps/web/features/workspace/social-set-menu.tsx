"use client"

import { ChevronsUpDown } from "lucide-react"
import type { Platform } from "@workspace/api/contract"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import { PlatformIcon } from "@/components/platform-icon"

/** The set shown with its connected platforms, and the sets to switch to. */
export function SocialSetMenu({
  name,
  value,
  sets,
  platforms,
  onChoose,
  contentClassName,
  children,
}: {
  name: string
  value: string
  sets: { id: string; name: string }[]
  platforms: Platform[]
  onChoose: (id: string) => void
  /** For the menu, which renders outside the page's tree. */
  contentClassName?: string
  /** Items under the sets, such as adding one. */
  children?: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Social set: ${name}`}
        className="flex w-full items-center gap-2 rounded-md bg-card px-2.5 py-2 text-left ring-1 ring-border transition-colors outline-none hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="truncate text-sm font-medium">{name}</span>
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
      <DropdownMenuContent
        align="start"
        className={cn("w-56", contentClassName)}
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChoose}>
          <DropdownMenuLabel>Social sets</DropdownMenuLabel>
          {sets.map((set) => (
            <DropdownMenuRadioItem key={set.id} value={set.id} closeOnClick>
              <span className="truncate">{set.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {children && (
          <>
            <DropdownMenuSeparator />
            {children}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
