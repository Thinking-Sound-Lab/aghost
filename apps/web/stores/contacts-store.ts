import { create } from "zustand"
import type { Contact } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

let generation = 0

type ContactsState = {
  /** Contacts belong to a social set. */
  socialSetId: string | null
  contacts: Contact[]
  total: number
  hasMore: boolean
  query: string
  status: "idle" | "loading" | "ready" | "error"
  loadingMore: boolean
  error: string | null
  show: (socialSetId: string) => Promise<void>
  load: () => Promise<void>
  more: () => Promise<void>
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  socialSetId: null,
  contacts: [],
  total: 0,
  hasMore: false,
  query: "",
  status: "idle",
  loadingMore: false,
  error: null,
  show: async (socialSetId) => {
    set({ socialSetId })
    await get().load()
  },
  load: async () => {
    const { socialSetId } = get()
    if (!socialSetId) return
    const current = ++generation
    set({ status: "loading", error: null })
    try {
      const page = await api.contacts.list(socialSetId, get().query.trim())
      if (current === generation) set({ ...page, status: "ready" })
    } catch (error) {
      if (current === generation)
        set({ status: "error", error: errorMessage(error) })
    }
  },
  more: async () => {
    const { socialSetId } = get()
    if (!socialSetId || get().loadingMore) return
    const current = generation
    set({ loadingMore: true, error: null })
    try {
      const page = await api.contacts.list(
        socialSetId,
        get().query.trim(),
        get().contacts.length
      )
      // Another set or search replaced the list meanwhile.
      if (current !== generation) return
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
