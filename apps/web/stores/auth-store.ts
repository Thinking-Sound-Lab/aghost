import { create } from "zustand"
import { ApiClientError } from "@workspace/api/client"
import type { SessionUser } from "@workspace/api/contract"
import { analytics } from "@/lib/analytics"
import { api } from "@/lib/api"

type AuthState = {
  status: "idle" | "loading" | "signed_in" | "signed_out" | "error"
  user: SessionUser | null
  error: string | null
  load: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  user: null,
  error: null,
  load: async () => {
    if (get().status === "loading") return
    set({ status: "loading", error: null })
    try {
      const { user } = await api.auth.session()
      // Joins this browser's visits before sign-in to the person.
      analytics?.identify(user.id, { email: user.email })
      set({ user, status: "signed_in" })
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "unauthenticated")
        set({ user: null, status: "signed_out" })
      else
        set({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Could not load your session.",
        })
    }
  },
  signOut: async () => {
    set({ error: null })
    try {
      await api.auth.signOut()
      // Whoever uses this browser next starts as a new visitor.
      analytics?.reset()
      set({ user: null, status: "signed_out" })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Could not sign out.",
      })
    }
  },
}))
