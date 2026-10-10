import { create } from "zustand"
import type { Conversation, Message } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

type InboxState = {
  conversations: Conversation[]
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  query: string
  selected: Conversation | null
  messages: Message[]
  messagesLoading: boolean
  messagesError: string | null
  draft: string
  sending: boolean
  load: () => Promise<void>
  open: (conversation: Conversation) => Promise<void>
  send: () => Promise<void>
}

export const useInboxStore = create<InboxState>((set, get) => ({
  conversations: [],
  status: "idle",
  error: null,
  query: "",
  selected: null,
  messages: [],
  messagesLoading: false,
  messagesError: null,
  draft: "",
  sending: false,
  load: async () => {
    set({ status: "loading", error: null })
    try {
      set({ conversations: await api.inbox.list(), status: "ready" })
    } catch (error) {
      set({ status: "error", error: errorMessage(error) })
    }
  },
  open: async (conversation) => {
    set({
      selected: conversation,
      messages: [],
      messagesLoading: true,
      messagesError: null,
      draft: "",
    })
    try {
      const messages = await api.inbox.messages(
        conversation.instagramAccountId,
        conversation.id
      )
      if (get().selected?.id === conversation.id) set({ messages })
    } catch (error) {
      if (get().selected?.id === conversation.id)
        set({ messagesError: errorMessage(error) })
    } finally {
      if (get().selected?.id === conversation.id)
        set({ messagesLoading: false })
    }
  },
  send: async () => {
    const conversation = get().selected
    const text = get().draft.trim()
    if (!conversation || !text || get().sending) return
    set({ sending: true, messagesError: null })
    try {
      await api.inbox.send(conversation.instagramAccountId, conversation.id, {
        text,
      })
      const messages = await api.inbox.messages(
        conversation.instagramAccountId,
        conversation.id
      )
      if (get().selected?.id === conversation.id) set({ messages, draft: "" })
    } catch (error) {
      set({ messagesError: errorMessage(error) })
    } finally {
      set({ sending: false })
    }
  },
}))
