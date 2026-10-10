import { create } from "zustand"
import { ApiClientError } from "@workspace/api/client"
import type { SessionUser } from "@workspace/api/contract"
import { api } from "@/lib/api"

type AuthState = {
  status: "idle" | "loading" | "signed_in" | "signed_out" | "error"
  user: SessionUser | null
  error: string | null
  load: () => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: SessionUser) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  user: null,
  error: null,
  setUser: (user) => set({ user, status: "signed_in", error: null }),
  load: async () => {
    if (get().status === "loading") return
    set({ status: "loading", error: null })
    try {
      const { user } = await api.auth.session()
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
      set({ user: null, status: "signed_out" })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Could not sign out.",
      })
    }
  },
}))

type FormState = {
  email: string
  password: string
  busy: boolean
  error: string | null
  message: string | null
  set: (
    patch: Partial<
      Pick<FormState, "email" | "password" | "busy" | "error" | "message">
    >
  ) => void
  reset: () => void
}
export const useAuthForm = create<FormState>((set) => ({
  email: "",
  password: "",
  busy: false,
  error: null,
  message: null,
  set: (patch) => set(patch),
  reset: () =>
    set({ email: "", password: "", busy: false, error: null, message: null }),
}))
