"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  authorizePath,
  billingChoice,
  billingLoginPath,
} from "@workspace/api/contract"
import {
  CalendarDays,
  ChartNoAxesCombined,
  House,
  Inbox,
  Monitor,
  Moon,
  PanelLeft,
  Settings,
  Sun,
  UsersRound,
  Workflow,
  X,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Brand } from "@/components/brand"
import { Avatar, ErrorBanner, Loading } from "@/components/interface"
import { Paywall } from "@/features/billing/paywall"
import { useAuthStore } from "@/stores/auth-store"
import { hasPlan, useWorkspaceStore } from "@/stores/workspace-store"
import { useBillingStore } from "@/stores/billing-store"
import { usePendingConnectionStore } from "@/stores/pending-connection-store"
import { THEMES, useThemeStore } from "@/stores/theme-store"

const ITEM =
  "flex h-11 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"

const navigation = [
  { href: "/home", label: "Home", icon: House },
  { href: "/contacts", label: "Contacts", icon: UsersRound },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
]

const themeOptions = {
  system: { label: "System", icon: Monitor },
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
}

function SidebarContent({
  onNavigate,
  closeButton,
}: {
  onNavigate?: () => void
  closeButton?: React.ReactNode
}) {
  const auth = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const pathname = usePathname()
  const name = auth.user?.name?.trim() || "Your account"

  return (
    <>
      <div className="flex h-11 shrink-0 items-center justify-between px-2.5 md:h-9">
        <Brand href="/home" onClick={onNavigate} />
        {closeButton}
      </div>
      <nav
        aria-label="Workspace"
        className="mt-6 grid gap-1 overflow-y-auto md:mt-8 md:gap-px"
      >
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                ITEM,
                active && "bg-card font-medium text-foreground hover:bg-card"
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto grid shrink-0 gap-px pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${name} account menu`}
            className={cn(
              ITEM,
              "h-12 w-full min-w-0 px-2 text-foreground md:h-12"
            )}
          >
            <Avatar
              src={auth.user?.avatarUrl ?? null}
              name={name}
              className="size-8 bg-card ring-1 ring-border"
            />
            <span className="min-w-0 flex-1 truncate text-left font-medium">
              {name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-52">
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              {THEMES.map((option) => {
                const { label, icon: Icon } = themeOptions[option]
                return (
                  <DropdownMenuRadioItem key={option} value={option}>
                    <Icon aria-hidden="true" />
                    {label}
                  </DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => void auth.signOut()}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

function MobileNavigation() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)")
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false)
    }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <header className="flex shrink-0 items-center gap-2 border-b bg-sidebar px-3 py-2 md:hidden">
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Open sidebar"
            />
          }
        >
          <PanelLeft aria-hidden="true" className="size-5" />
        </DialogTrigger>
        <Brand href="/home" />
      </header>
      <DialogContent
        showCloseButton={false}
        overlayClassName="data-open:motion-reduce:animate-none data-closed:motion-reduce:animate-none"
        className="top-0 left-0 flex h-dvh w-72 max-w-[calc(100%-3rem)] translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-sidebar px-2 pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:max-w-[calc(100%-3rem)] data-open:zoom-in-100 data-open:slide-in-from-left-4 data-open:motion-reduce:animate-none data-closed:zoom-out-100 data-closed:slide-out-to-left-4 data-closed:motion-reduce:animate-none"
      >
        <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a page in your workspace.
        </DialogDescription>
        <SidebarContent
          onNavigate={() => setOpen(false)}
          closeButton={
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Close sidebar"
                />
              }
            >
              <X aria-hidden="true" className="size-5" />
            </DialogClose>
          }
        />
      </DialogContent>
    </Dialog>
  )
}

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
      useBillingStore.getState().clear()
      router.replace(
        pathname === "/settings" && window.location.hash === "#billing"
          ? billingLoginPath(
              billingChoice(
                Object.fromEntries(new URLSearchParams(window.location.search))
              )
            )
          : "/login"
      )
    }
    if (auth.status === "signed_in" && workspace.status === "idle")
      void workspace.load()
  }, [
    auth.status,
    workspace.status,
    workspace.load,
    workspace.clear,
    router,
    pathname,
  ])
  // An app waited to connect while the owner chose a plan.
  const pendingRequestId = usePendingConnectionStore((state) => state.requestId)
  const forgetConnection = usePendingConnectionStore((state) => state.forget)
  const canConnect =
    auth.status === "signed_in" &&
    workspace.status === "ready" &&
    hasPlan(workspace.billing)
  useEffect(() => {
    if (!pendingRequestId || !canConnect) return
    forgetConnection()
    router.replace(authorizePath(pendingRequestId))
  }, [pendingRequestId, canConnect, forgetConnection, router])

  if (auth.status === "error")
    return (
      <div className="grid h-dvh place-items-center p-6">
        <ErrorBanner message={auth.error} retry={() => void auth.load()} />
      </div>
    )
  if (auth.status !== "signed_in") return <Loading className="h-dvh" />
  // Nothing of the dashboard shows until the workspace is known to have a plan.
  if (!hasPlan(workspace.billing)) {
    if (workspace.status === "ready") return <Paywall />
    if (workspace.status !== "error") return <Loading className="h-dvh" />
    return (
      <div className="grid h-dvh place-items-center p-6">
        <ErrorBanner
          message={workspace.error}
          retry={() => void workspace.load()}
        />
      </div>
    )
  }

  return (
    <div className="flex h-dvh">
      {/* The logo and menu line up with page titles and content. */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar px-2 pt-10 pb-2 md:flex">
        <SidebarContent />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNavigation key={pathname} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
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
    </div>
  )
}
