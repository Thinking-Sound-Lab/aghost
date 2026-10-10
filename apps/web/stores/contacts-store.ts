import { create } from "zustand"
import type { Contact } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

type ContactsState = {
  contacts: Contact[]
  total: number
  hasMore: boolean
  query: string
  status: "idle" | "loading" | "ready" | "error"
  loadingMore: boolean
  error: string | null
  load: () => Promise<void>
  more: () => Promise<void>
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  total: 0,
  hasMore: false,
  query: "",
  status: "idle",
  loadingMore: false,
  error: null,
  load: async () => {
    set({ status: "loading", error: null })
    try {
      const page = await api.contacts.list(get().query.trim())
      set({ ...page, status: "ready" })
    } catch (error) {
      set({ status: "error", error: errorMessage(error) })
    }
  },
  more: async () => {
    if (get().loadingMore) return
    set({ loadingMore: true, error: null })
    try {
      const page = await api.contacts.list(
        get().query.trim(),
        get().contacts.length
      )
      set({
        contacts: [...get().contacts, ...page.contacts],
        total: page.total,
        hasMore: page.hasMore,
      })
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ loadingMore: false })
    }
  },
}))
