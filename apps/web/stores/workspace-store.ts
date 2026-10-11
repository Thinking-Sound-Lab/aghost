import { create } from "zustand"
import { ApiClientError } from "@workspace/api/client"
import type {
  Automation,
  AutomationStatsById,
  InstagramAccount,
  IntegrationStatus,
  Workspace,
  BillingState,
} from "@workspace/api/contract"
import { isEntitled } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useAuthStore } from "./auth-store"

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "unauthenticated")
    useAuthStore.setState({ user: null, status: "signed_out" })
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Try again."
}

type WorkspaceState = {
  workspace: Workspace | null
  accounts: InstagramAccount[]
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
  connect: () => Promise<void>
  sync: () => Promise<void>
  toggle: (automation: Automation) => Promise<void>
  removeAutomation: (id: string) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  rename: (name: string) => Promise<void>
  clear: () => void
}
const initial = {
  workspace: null,
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
      const [workspace, accounts, automations, integration, billing] =
        await Promise.all([
          api.workspace.get(),
          api.accounts.list(),
          api.automations.list(),
          api.integrations(),
          api.billing.get(),
        ])
      set({
        workspace,
        accounts,
        automations,
        integration,
        billing,
        status: "ready",
      })
    } catch (error) {
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
  connect: async () => {
    if (get().busy) return
    const subscription = get().billing?.subscription
    if (!subscription || !isEntitled(subscription.status)) {
      window.location.assign("/settings#billing")
      return
    }
    set({ busy: true, error: null })
    try {
      const { authUrl } = await api.accounts.connect()
      window.location.assign(authUrl)
    } catch (error) {
      set({ error: errorMessage(error), busy: false })
    }
  },
  sync: async () => {
    set({ busy: true, error: null })
    try {
      set({ accounts: await api.accounts.sync() })
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
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
