"use client"

import { useEffect, type FormEvent } from "react"
import { create } from "zustand"
import { Plus, RefreshCw } from "lucide-react"
import {
  WORKSPACE_NAME_MAX_LENGTH,
  PLANS,
  PLATFORMS,
  PLATFORM_RULES,
  accountLabel,
  type ChoosePlanInput,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { ConfirmButton, Page } from "@/components/interface"
import { ChannelAvatar, PlatformIcon } from "@/components/platform-icon"
import { Billing } from "@/features/billing/billing"
import { useAuthStore } from "@/stores/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useBillingStore } from "@/stores/billing-store"
import { ApiAccess } from "./api-access"
import { McpAccess } from "./mcp-access"

const tabs = [
  { id: "general", label: "General" },
  { id: "channels", label: "Channels" },
  { id: "api", label: "API" },
  { id: "mcp", label: "MCP" },
  { id: "billing", label: "Plan and Billing" },
  { id: "account", label: "Account" },
] as const

type Tab = (typeof tabs)[number]["id"]

const useSettings = create<{ tab: Tab; name: string }>(() => ({
  tab: "general",
  name: "",
}))

function select(tab: Tab) {
  useSettings.setState({ tab })
  // Keeps the tab in the address so it can be linked to and reloaded.
  history.replaceState(null, "", `#${tab}`)
}

export function Settings({ choice }: { choice: ChoosePlanInput | null }) {
  const { tab } = useSettings()
  const selectPlan = useBillingStore((state) => state.select)
  const selectedPlan = choice?.plan
  const selectedInterval = choice?.interval
  useEffect(() => {
    // Settings stays mounted when Billing is hidden by another tab. Apply
    // the URL choice here so returning to Billing keeps the user's edits.
    if (selectedPlan && selectedInterval)
      selectPlan({ plan: selectedPlan, interval: selectedInterval })
  }, [selectPlan, selectedPlan, selectedInterval])
  useEffect(() => {
    function follow() {
      const linked = tabs.find((item) => `#${item.id}` === location.hash)
      if (linked) useSettings.setState({ tab: linked.id })
    }
    follow()
    window.addEventListener("hashchange", follow)
    return () => window.removeEventListener("hashchange", follow)
  }, [])
  return (
    <Page title="Settings">
      <div role="tablist" className="-mt-3 flex flex-wrap gap-6">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => select(item.id)}
            className={cn(
              "border-b-2 border-transparent pb-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
              tab === item.id && "border-foreground font-medium text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className={cn(tab !== "billing" && "max-w-2xl")}>
        {tab === "general" && <General />}
        {tab === "channels" && <Channels />}
        {tab === "api" && <ApiAccess />}
        {tab === "mcp" && <McpAccess />}
        {tab === "billing" && <Billing />}
        {tab === "account" && <Account />}
      </div>
    </Page>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-14 items-center gap-6 py-2">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  )
}

function General() {
  const store = useWorkspaceStore()
  const { name } = useSettings()
  const saved = store.workspace?.name ?? ""
  useEffect(() => {
    useSettings.setState({ name: saved })
  }, [saved])
  function submit(event: FormEvent) {
    event.preventDefault()
    void store.rename(name)
  }
  return (
    <Row label="Workspace name">
      <form onSubmit={submit} className="flex flex-1 gap-2">
        <Input
          required
          aria-label="Workspace name"
          maxLength={WORKSPACE_NAME_MAX_LENGTH}
          value={name}
          onChange={(event) =>
            useSettings.setState({ name: event.target.value })
          }
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={store.busy || name.trim() === saved}
        >
          Save
        </Button>
      </form>
    </Row>
  )
}

function Channels() {
  const store = useWorkspaceStore()
  const subscription = store.billing?.subscription
  const connected = store.accounts.filter(
    (account) => account.status === "connected"
  ).length
  const limit = subscription ? PLANS[subscription.plan].channels : 0
  const available = Boolean(store.integration?.instagramConfigured)
  return (
    <section className="grid gap-3">
      <div className="flex min-h-14 items-center gap-2.5">
        <h2 className="mr-auto text-sm font-medium">Channels</h2>
        {store.accounts.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh channels"
            disabled={store.busy}
            onClick={() => void store.sync()}
          >
            <RefreshCw />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={store.busy || !available || connected >= limit}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Plus />
            Connect channel
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              {PLATFORMS.map((platform) => (
                <DropdownMenuItem
                  key={platform}
                  onClick={() => void store.connect(platform)}
                >
                  <PlatformIcon platform={platform} />
                  {PLATFORM_RULES[platform].name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-sm text-muted-foreground">
        {connected} of {limit} channels connected.{" "}
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => select("billing")}
        >
          Manage plan
        </button>
      </p>
      {!available && (
        <p className="text-sm text-muted-foreground">
          Channel connections are not available yet.
        </p>
      )}
      {store.accounts.length > 0 && (
        <div className="divide-y">
          {store.accounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3 py-3">
              <ChannelAvatar account={account} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {accountLabel(account)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {account.status === "connected"
                    ? [
                        PLATFORM_RULES[account.platform].name,
                        account.displayName !== accountLabel(account) &&
                          account.displayName,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : account.disconnectReason}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  account.status === "connected"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {account.status === "connected" ? "Connected" : "Disconnected"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={store.busy}
                title="Authorize again, including permission to publish posts"
                onClick={() => void store.reconnect(account.id)}
              >
                Reconnect
              </Button>
              <ConfirmButton
                title={`Disconnect ${accountLabel(account)}?`}
                description={
                  account.platform === "instagram"
                    ? "Its automations and scheduled posts are deleted too."
                    : "Its scheduled posts are deleted too."
                }
                confirmLabel="Disconnect"
                busy={store.busy}
                onConfirm={() => store.removeAccount(account.id)}
              >
                Disconnect
              </ConfirmButton>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Account() {
  const auth = useAuthStore()
  return (
    <div className="divide-y">
      <Row label="Email">
        <span className="truncate text-sm">{auth.user?.email}</span>
      </Row>
      <Row label="Session">
        <Button variant="secondary" onClick={() => void auth.signOut()}>
          Log out
        </Button>
      </Row>
    </div>
  )
}
