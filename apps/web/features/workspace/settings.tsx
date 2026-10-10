"use client"

import { useEffect, type FormEvent } from "react"
import Link from "next/link"
import { create } from "zustand"
import { CreditCard, RefreshCw } from "lucide-react"
import { WORKSPACE_NAME_MAX_LENGTH } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Instagram } from "@/components/instagram-icon"
import { Avatar, ConfirmButton, EmptyState, Page } from "@/components/interface"
import { useAuthStore } from "@/stores/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
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

export function Settings() {
  const { tab } = useSettings()
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
      <div role="tabpanel" className="max-w-2xl">
        {tab === "general" && <General />}
        {tab === "channels" && <Channels />}
        {tab === "api" && <ApiAccess />}
        {tab === "mcp" && <McpAccess />}
        {tab === "billing" && (
          <EmptyState icon={<CreditCard />} title="Billing isn't set up yet" />
        )}
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
  return (
    <section className="grid gap-3">
      <div className="flex min-h-14 items-center gap-2.5">
        <Instagram size={18} />
        <h2 className="mr-auto text-sm font-medium">Instagram</h2>
        {store.accounts.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh accounts"
            disabled={store.busy}
            onClick={() => void store.sync()}
          >
            <RefreshCw />
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={store.busy || !store.integration?.instagramConfigured}
          onClick={() => void store.connect()}
        >
          Connect account
        </Button>
      </div>
      {!store.integration?.instagramConfigured && (
        <p className="text-sm text-muted-foreground">
          Add ZERNIO_API_KEY to the server environment to connect Instagram.
        </p>
      )}
      {store.accounts.length > 0 && (
        <div className="divide-y">
          {store.accounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3 py-3">
              <Avatar src={account.profilePictureUrl} name={account.username} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  @{account.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {account.status === "connected"
                    ? account.displayName
                    : account.disconnectReason}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  account.status === "connected"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {account.status === "connected" ? "Connected" : "Disconnected"}
              </span>
              <ConfirmButton
                title={`Disconnect @${account.username}?`}
                description="Its automations are deleted too."
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
      <Row label="Password">
        <Link
          href="/forgot-password"
          className={buttonVariants({ variant: "secondary" })}
        >
          Reset password
        </Link>
      </Row>
      <Row label="Session">
        <Button variant="secondary" onClick={() => void auth.signOut()}>
          Log out
        </Button>
      </Row>
    </div>
  )
}
