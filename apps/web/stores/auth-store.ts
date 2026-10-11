import { create } from "zustand"
import { ApiClientError } from "@workspace/api/client"
import type { SessionUser } from "@workspace/api/contract"
import { analytics, forgetPerson } from "@/lib/analytics"
import { api } from "@/lib/api"

type AuthState = {
  status: "idle" | "loading" | "signed_in" | "signed_out" | "error"
  user: SessionUser | null
  error: string | null
  load: () => Promise<void>
  signOut: () => Promise<void>
  /** The session ended without signing out, for example it expired. */
  expire: () => void
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
        get().expire()
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
      get().expire()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Could not sign out.",
      })
    }
  },
  expire: () => {
    forgetPerson()
    set({ user: null, status: "signed_out" })
  },
}))
