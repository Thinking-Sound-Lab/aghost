"use client"

import { useEffect, type FormEvent } from "react"
import { create } from "zustand"
import { Plus, RefreshCw } from "lucide-react"
import {
  WORKSPACE_NAME_MAX_LENGTH,
  PLATFORMS,
  PLATFORM_RULES,
  accountLabel,
  socialSetCount,
  type ChoosePlanInput,
  type Platform,
  type SocialSet,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ConfirmButton, Page } from "@/components/interface"
import { ChannelAvatar, PlatformIcon } from "@/components/platform-icon"
import { Billing } from "@/features/billing/billing"
import { useAuthStore } from "@/stores/auth-store"
import { useSocialSetStore } from "@/stores/social-set-store"
import {
  canConnect,
  setLimit,
  useWorkspaceStore,
} from "@/stores/workspace-store"
import { useBillingStore } from "@/stores/billing-store"
import { ApiAccess } from "./api-access"
import { McpAccess } from "./mcp-access"

const tabs = [
  { id: "general", label: "General" },
  { id: "channels", label: "Social sets" },
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

/** A channel in a set: the account, or an empty place to connect one. */
function ChannelRow({ set, platform }: { set: SocialSet; platform: Platform }) {
  const store = useWorkspaceStore()
  const accounts = store.accounts.filter(
    (account) => account.socialSetId === set.id && account.platform === platform
  )
  const { name } = PLATFORM_RULES[platform]
  if (accounts.length === 0)
    return (
      <div className="flex items-center gap-3 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <PlatformIcon platform={platform} />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {name}
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={store.busy || !canConnect(store, set.id, platform)}
          onClick={() => void store.connect(platform, set.id)}
        >
          Connect
        </Button>
      </div>
    )
  return accounts.map((account) => (
    <div key={account.id} className="flex items-center gap-3 py-3">
      <ChannelAvatar account={account} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{accountLabel(account)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {account.status === "connected"
            ? [
                name,
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
  ))
}

function SocialSetCard({ set }: { set: SocialSet }) {
  const store = useWorkspaceStore()
  const empty = !store.accounts.some(
    (account) => account.socialSetId === set.id
  )
  function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get("name")).trim()
    if (name && name !== set.name) void store.renameSet(set.id, name)
  }
  return (
    <section className="grid gap-1" aria-label={set.name}>
      <form onSubmit={rename} className="flex items-center gap-2">
        <Input
          key={set.name}
          name="name"
          required
          aria-label="Social set name"
          maxLength={60}
          defaultValue={set.name}
          onBlur={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-9 max-w-64 border-transparent bg-transparent px-2 font-medium shadow-none hover:border-input focus-visible:border-input"
        />
        <span className="mr-auto" />
        {empty && store.socialSets.length > 1 && (
          <ConfirmButton
            title={`Delete ${set.name}?`}
            description="The set has no channels, so nothing else is removed."
            confirmLabel="Delete"
            busy={store.busy}
            onConfirm={() => store.removeSet(set.id)}
          >
            Delete
          </ConfirmButton>
        )}
      </form>
      <div className="divide-y px-2">
        {PLATFORMS.map((platform) => (
          <ChannelRow key={platform} set={set} platform={platform} />
        ))}
      </div>
    </section>
  )
}

function Channels() {
  const store = useWorkspaceStore()
  const choose = useSocialSetStore((state) => state.choose)
  const limit = setLimit(store.billing)
  const available = Boolean(store.integration?.instagramConfigured)
  async function add() {
    const created = await store.createSet(
      `Social set ${store.socialSets.length + 1}`
    )
    if (created) choose(created.id)
  }
  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <div className="flex min-h-14 items-center gap-2.5">
          <h2 className="mr-auto text-sm font-medium">Social sets</h2>
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
          <Button
            variant="secondary"
            size="sm"
            disabled={store.busy || store.socialSets.length >= limit}
            onClick={() => void add()}
          >
            <Plus />
            New social set
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Each set holds one account on every platform, such as one brand.{" "}
          {store.socialSets.length} of {socialSetCount(limit)} in use.{" "}
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
      </div>
      {store.socialSets.map((set) => (
        <SocialSetCard key={set.id} set={set} />
      ))}
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
