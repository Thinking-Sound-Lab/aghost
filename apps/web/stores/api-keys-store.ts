import { create } from "zustand"
import {
  API_KEY_READ_SCOPES,
  type ApiKey,
  type ApiKeyScope,
  type CreatedApiKey,
} from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

type ApiKeysState = {
  keys: ApiKey[]
  created: CreatedApiKey | null
  name: string
  scopes: ApiKeyScope[]
  expiresInDays: number
  status: "idle" | "loading" | "ready" | "error"
  busy: boolean
  error: string | null
  load: () => Promise<void>
  create: () => Promise<void>
  revoke: (id: string) => Promise<void>
  reset: () => void
}

const initial = () => ({
  keys: [],
  created: null,
  name: "",
  scopes: [...API_KEY_READ_SCOPES],
  expiresInDays: 90,
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
  create: async () => {
    if (get().busy) return
    const current = generation
    const { name, scopes, expiresInDays } = get()
    set({ busy: true, error: null, created: null })
    try {
      const created = await api.apiKeys.create({
        name,
        scopes,
        expiresAt: new Date(
          Date.now() + expiresInDays * 86_400_000
        ).toISOString(),
      })
      if (current === generation)
        set({ created, keys: [created.key, ...get().keys], name: "" })
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
