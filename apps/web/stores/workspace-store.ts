import { create } from "zustand"
import { ApiClientError } from "@workspace/api/client"
import type {
  Automation,
  AutomationStatsById,
  Account,
  IntegrationStatus,
  Platform,
  SocialSet,
  Workspace,
  BillingState,
} from "@workspace/api/contract"
import { PLANS, isEntitled } from "@workspace/api/contract"
import { announceAccountsChanged } from "@/lib/account-events"
import { analytics } from "@/lib/analytics"
import { api } from "@/lib/api"
import { useAuthStore } from "./auth-store"

/** Whether the workspace is past the paywall. */
export function hasPlan(billing: BillingState | null): boolean {
  const subscription = billing?.subscription
  return Boolean(subscription && isEntitled(subscription.status))
}

/** The social sets the workspace's plan includes. */
export function setLimit(billing: BillingState | null): number {
  const subscription = billing?.subscription
  return subscription && isEntitled(subscription.status)
    ? PLANS[subscription.plan].socialSets
    : 0
}

/**
 * Whether the set can take an account on the platform: the plan covers the
 * workspace's sets and the set has none there yet.
 */
export function canConnect(
  state: Pick<
    WorkspaceState,
    "accounts" | "billing" | "integration" | "socialSets"
  >,
  socialSetId: string,
  platform: Platform
): boolean {
  return (
    Boolean(state.integration?.instagramConfigured) &&
    state.socialSets.length <= setLimit(state.billing) &&
    !state.accounts.some(
      (account) =>
        account.socialSetId === socialSetId &&
        account.platform === platform &&
        account.status === "connected"
    )
  )
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "unauthenticated")
    useAuthStore.getState().expire()
  // The plan ended while the dashboard was open: reloading shows the paywall.
  if (error instanceof ApiClientError && error.code === "plan_required")
    void useWorkspaceStore.getState().load()
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Try again."
}

type WorkspaceState = {
  workspace: Workspace | null
  /** Groups of one account per platform; the first is the oldest. */
  socialSets: SocialSet[]
  accounts: Account[]
  automations: Automation[]
  stats: AutomationStatsById | null
  integration: IntegrationStatus | null
  billing: BillingState | null
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  statsError: string | null
  busy: boolean
  query: string
  /** The automation waiting for delete confirmation. */
  pendingDelete: string | null
  load: () => Promise<void>
  loadStats: () => Promise<void>
  applySaved: (automation: Automation) => void
  /** Connects an account on the platform to the social set. */
  connect: (platform: Platform, socialSetId: string) => Promise<void>
  /**
   * Authorizes a new account in another tab, so the page stays as it is.
   * That tab closes itself once the account is saved.
   */
  connectInNewTab: (platform: Platform, socialSetId: string) => Promise<void>
  /** Adds a social set, returning it, or null when it couldn't be added. */
  createSet: (name: string) => Promise<SocialSet | null>
  renameSet: (id: string, name: string) => Promise<void>
  removeSet: (id: string) => Promise<void>
  /** Authorizes an account again, to grant the permissions it lacks. */
  reconnect: (id: string) => Promise<void>
  sync: () => Promise<void>
  /** Reads the accounts again, after another tab changed them. */
  reloadAccounts: () => Promise<void>
  toggle: (automation: Automation) => Promise<void>
  removeAutomation: (id: string) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  rename: (name: string) => Promise<void>
  clear: () => void
}
const initial = {
  workspace: null,
  socialSets: [],
  accounts: [],
  automations: [],
  stats: null,
  integration: null,
  billing: null,
  status: "idle" as const,
  error: null,
  statsError: null,
  busy: false,
  query: "",
  pendingDelete: null,
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initial,
  clear: () => set(initial),
  load: async () => {
    if (get().status === "loading") return
    set({ status: "loading", error: null })
    try {
      const [integration, billing] = await Promise.all([
        api.integrations(),
        api.billing.get(),
      ])
      // Joins the workspace before the paywall, so steps to a purchase count.
      analytics?.group("workspace", billing.workspaceId)
      // Without a plan the API serves only billing, for the paywall.
      if (!hasPlan(billing)) {
        set({ ...initial, integration, billing, status: "ready" })
        return
      }
      const [workspace, socialSets, accounts, automations] = await Promise.all([
        api.workspace.get(),
        api.socialSets.list(),
        api.accounts.list(),
        api.automations.list(),
      ])
      analytics?.group("workspace", workspace.id, {
        workspace_name: workspace.name,
      })
      set({
        workspace,
        socialSets,
        accounts,
        automations,
        integration,
        billing,
        status: "ready",
      })
    } catch (error) {
      // The plan ended between the billing read and the workspace reads.
      if (error instanceof ApiClientError && error.code === "plan_required") {
        set({ status: "idle" })
        return get().load()
      }
      set({ error: errorMessage(error), status: "error" })
    }
  },
  loadStats: async () => {
    set({ statsError: null })
    try {
      set({ stats: await api.automations.stats() })
    } catch (error) {
      set({ stats: null, statsError: errorMessage(error) })
    }
  },
  applySaved: (automation) => {
    const automations = get().automations
    set({
      automations: automations.some((item) => item.id === automation.id)
        ? automations.map((item) =>
            item.id === automation.id ? automation : item
          )
        : [automation, ...automations],
    })
    // Updates the counts in place; the page keeps rendering meanwhile.
    void get().loadStats()
  },
  connect: async (platform, socialSetId) => {
    if (get().busy) return
    set({ busy: true, error: null })
    try {
      const { authUrl } = await api.accounts.connect(platform, socialSetId)
      window.location.assign(authUrl)
    } catch (error) {
      set({ error: errorMessage(error), busy: false })
    }
  },
  connectInNewTab: async (platform, socialSetId) => {
    if (get().busy) return
    // Opened during the click, before the request, so it is not blocked.
    const tab = window.open("", "_blank")
    if (!tab) {
      set({ error: "Allow pop-ups for aghost to connect a channel here." })
      return
    }
    tab.opener = null
    set({ busy: true, error: null })
    try {
      const { authUrl } = await api.accounts.connect(platform, socialSetId)
      tab.location.href = authUrl
    } catch (error) {
      tab.close()
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  reconnect: async (id) => {
    if (get().busy) return
    set({ busy: true, error: null })
    try {
      const { authUrl } = await api.accounts.reconnect(id)
      window.location.assign(authUrl)
    } catch (error) {
      set({ error: errorMessage(error), busy: false })
    }
  },
  sync: async () => {
    set({ busy: true, error: null })
    try {
      set({ accounts: await api.accounts.sync() })
      announceAccountsChanged()
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  reloadAccounts: async () => {
    try {
      set({ accounts: await api.accounts.list() })
    } catch (error) {
      set({ error: errorMessage(error) })
    }
  },
  toggle: async (automation) => {
    if (get().busy) return
    set({ busy: true, error: null })
    try {
      const updated = await api.automations.status(
        automation.id,
        automation.status === "active" ? "paused" : "active"
      )
      set({
        automations: get().automations.map((item) =>
          item.id === updated.id ? updated : item
        ),
      })
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  removeAutomation: async (id) => {
    set({ busy: true, error: null })
    try {
      await api.automations.remove(id)
      set({ automations: get().automations.filter((item) => item.id !== id) })
      await get().loadStats()
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  removeAccount: async (id) => {
    set({ busy: true, error: null })
    try {
      await api.accounts.remove(id)
      set({
        accounts: get().accounts.filter((item) => item.id !== id),
        automations: get().automations.filter(
          (item) => item.instagramAccountId !== id
        ),
      })
      await get().loadStats()
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  createSet: async (name) => {
    set({ busy: true, error: null })
    try {
      const created = await api.socialSets.create({ name })
      set({ socialSets: [...get().socialSets, created] })
      return created
    } catch (error) {
      set({ error: errorMessage(error) })
      return null
    } finally {
      set({ busy: false })
    }
  },
  renameSet: async (id, name) => {
    set({ busy: true, error: null })
    try {
      const renamed = await api.socialSets.rename(id, { name })
      set({
        socialSets: get().socialSets.map((item) =>
          item.id === id ? renamed : item
        ),
      })
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  removeSet: async (id) => {
    set({ busy: true, error: null })
    try {
      await api.socialSets.remove(id)
      set({ socialSets: get().socialSets.filter((item) => item.id !== id) })
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  rename: async (name) => {
    set({ busy: true, error: null })
    try {
      set({ workspace: await api.workspace.rename(name) })
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
}))
