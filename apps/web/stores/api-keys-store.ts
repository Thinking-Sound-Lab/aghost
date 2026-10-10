import { create } from "zustand"
import type { ApiKey, CreatedApiKey } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

type ApiKeysState = {
  keys: ApiKey[]
  created: CreatedApiKey | null
  status: "idle" | "loading" | "ready" | "error"
  busy: boolean
  error: string | null
  load: () => Promise<void>
  create: (name: string) => Promise<void>
  revoke: (id: string) => Promise<void>
  reset: () => void
}

const initial = () => ({
  keys: [],
  created: null,
  status: "idle" as const,
  busy: false,
  error: null,
})

// Discard a pending response when the tab unmounts or the signed-in user changes.
let generation = 0
export const useApiKeysStore = create<ApiKeysState>((set, get) => ({
  ...initial(),
  reset: () => {
    generation++
    set(initial())
  },
  load: async () => {
    const current = ++generation
    set({ status: "loading", error: null })
    try {
      const keys = await api.apiKeys.list()
      if (current === generation) set({ keys, status: "ready" })
    } catch (error) {
      if (current === generation)
        set({ status: "error", error: errorMessage(error) })
    }
  },
  create: async (name) => {
    if (get().busy || get().created) return
    const current = generation
    set({ busy: true, error: null, created: null })
    try {
      const created = await api.apiKeys.create({ name })
      if (current === generation)
        set({ created, keys: [created.key, ...get().keys] })
    } catch (error) {
      if (current === generation) set({ error: errorMessage(error) })
    } finally {
      if (current === generation) set({ busy: false })
    }
  },
  revoke: async (id) => {
    if (get().busy) return
    const current = generation
    set({ busy: true, error: null })
    try {
      await api.apiKeys.revoke(id)
      if (current === generation)
        set({
          keys: get().keys.map((key) =>
            key.id === id
              ? { ...key, revokedAt: new Date().toISOString() }
              : key
          ),
          created: get().created?.key.id === id ? null : get().created,
        })
    } catch (error) {
      if (current === generation) set({ error: errorMessage(error) })
    } finally {
      if (current === generation) set({ busy: false })
    }
  },
}))
