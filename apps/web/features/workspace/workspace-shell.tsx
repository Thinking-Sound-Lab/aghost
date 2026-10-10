"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CircleHelp,
  House,
  Inbox,
  Settings,
  UsersRound,
  Workflow,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Brand } from "@/components/brand"
import { Avatar, ErrorBanner, Loading } from "@/components/interface"
import { useAuthStore } from "@/stores/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

const HELP_URL = "https://github.com/Abhishekucs/aghost#readme"
const ITEM =
  "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"

const navigation = [
  { href: "/home", label: "Home", icon: House },
  { href: "/contacts", label: "Contacts", icon: UsersRound },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore()
  const workspace = useWorkspaceStore()
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    if (auth.status === "idle") void auth.load()
  }, [auth.status, auth.load])
  useEffect(() => {
    if (auth.status === "signed_out") {
      workspace.clear()
      router.replace("/login")
    }
    if (auth.status === "signed_in" && workspace.status === "idle")
      void workspace.load()
  }, [auth.status, workspace.status, workspace.load, workspace.clear, router])

  if (auth.status === "error")
    return (
      <div className="grid h-dvh place-items-center p-6">
        <ErrorBanner message={auth.error} retry={() => void auth.load()} />
      </div>
    )
  if (auth.status !== "signed_in") return <Loading className="h-dvh" />

  return (
    <div className="flex h-dvh">
      {/* The logo and menu line up with page titles and content. */}
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted px-2 pt-10 pb-2">
        <div className="flex h-9 items-center px-2.5">
          <Brand href="/home" />
        </div>
        <nav aria-label="Workspace" className="mt-8 grid gap-px">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  ITEM,
                  active && "bg-card font-medium text-foreground hover:bg-card"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto grid gap-px">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(ITEM, "h-9 w-full min-w-0 px-2 text-foreground")}
            >
              <Avatar
                src={null}
                name={auth.user?.email ?? null}
                className="size-6 bg-card"
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {auth.user?.email}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => void auth.signOut()}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <a href={HELP_URL} target="_blank" rel="noreferrer" className={ITEM}>
            <CircleHelp className="size-4" />
            Help
          </a>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <ErrorBanner
          message={workspace.error ?? auth.error}
          retry={
            workspace.status === "error"
              ? () => void workspace.load()
              : undefined
          }
          className="m-4 mb-0"
        />
        {workspace.status === "ready" ? (
          children
        ) : workspace.status !== "error" ? (
          <Loading />
        ) : null}
      </main>
    </div>
  )
}
