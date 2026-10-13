import { create } from "zustand"
import { ApiClientError } from "@workspace/api/client"
import type { AuthorizationRequest } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useAuthStore } from "./auth-store"
import { usePendingConnectionStore } from "./pending-connection-store"

type AuthorizeState = {
  request: AuthorizationRequest | null
  status: "idle" | "loading" | "ready" | "error"
  /** Without a plan the owner can only send the app back. */
  planRequired: boolean
  busy: boolean
  error: string | null
  load: (id: string) => Promise<void>
  /** Approves or denies, then returns the browser to the app. */
  decide: (id: string, approve: boolean) => Promise<void>
  /** Forgets the request, so the page loads it afresh when it opens again. */
  reset: () => void
}

function message(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "unauthenticated")
    useAuthStore.getState().expire()
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Try again."
}

const initial = {
  request: null,
  status: "idle" as const,
  planRequired: false,
  busy: false,
  error: null,
}

export const useAuthorizeStore = create<AuthorizeState>((set, get) => {
  let version = 0
  return {
    ...initial,
    reset: () => {
      version++
      set(initial)
    },
    load: async (id) => {
      const loadingVersion = ++version
      set({ ...initial, status: "loading" })
      try {
        const request = await api.oauth.request(id)
        if (version !== loadingVersion) return
        set({ request, status: "ready", planRequired: false })
      } catch (error) {
        if (version !== loadingVersion) return
        const planRequired =
          error instanceof ApiClientError && error.code === "plan_required"
        // The page explains a missing plan itself.
        set({
          status: "error",
          planRequired,
          error: planRequired ? null : message(error),
        })
      }
    },
    decide: async (id, approve) => {
      if (get().busy) return
      set({ busy: true, error: null })
      try {
        const { redirectUrl } = approve
          ? await api.oauth.approve(id)
          : await api.oauth.deny(id)
        usePendingConnectionStore.getState().forget()
        // Stays busy while the browser leaves for the app.
        window.location.assign(redirectUrl)
      } catch (error) {
        set({ busy: false, error: message(error) })
      }
    },
  }
})
