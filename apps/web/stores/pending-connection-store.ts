import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type PendingConnectionState = {
  /** An app's request to connect, waiting while the owner chooses a plan. */
  requestId: string | null
  remember: (requestId: string) => void
  forget: () => void
}

/** Kept for this tab, so the request survives checkout on the payment site. */
export const usePendingConnectionStore = create<PendingConnectionState>()(
  persist(
    (set) => ({
      requestId: null,
      remember: (requestId) => set({ requestId }),
      forget: () => set({ requestId: null }),
    }),
    {
      name: "aghost-pending-connection",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
