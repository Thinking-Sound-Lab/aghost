import { create } from "zustand"
import {
  isEntitled,
  type BillingInterval,
  type BillingState,
  type PlanId,
  type ChoosePlanInput,
} from "@workspace/api/contract"
import { api } from "@/lib/api"
import { errorMessage, useWorkspaceStore } from "./workspace-store"

type BillingStore = {
  state: BillingState | null
  interval: BillingInterval
  selectedPlan: PlanId | null
  loading: boolean
  busy: boolean
  error: string | null
  notice: string | null
  clear: () => void
  select: (choice: ChoosePlanInput) => void
  load: (sync?: boolean) => Promise<void>
  choose: (plan: PlanId) => Promise<void>
  portal: () => Promise<void>
}

const initial = {
  state: null,
  interval: "monthly" as const,
  selectedPlan: null,
  loading: false,
  busy: false,
  error: null,
  notice: null,
}

export const useBillingStore = create<BillingStore>((set, get) => ({
  ...initial,
  clear: () => set(initial),
  select: (choice) =>
    set({ selectedPlan: choice.plan, interval: choice.interval }),
  load: async (sync = false) => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const state = sync ? await api.billing.sync() : await api.billing.get()
      set({
        state,
        ...(!get().state &&
          !get().selectedPlan && {
            interval: state.subscription?.interval ?? "monthly",
          }),
      })
      useWorkspaceStore.setState({ billing: state })
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ loading: false })
    }
  },
  choose: async (plan) => {
    if (get().busy) return
    set({ busy: true, error: null, notice: null })
    try {
      const choice = { plan, interval: get().interval }
      const current = get().state?.subscription
      if (current && isEntitled(current.status)) {
        const { state, paymentUrl } = await api.billing.changePlan(choice)
        set({ state })
        if (paymentUrl) {
          window.location.assign(paymentUrl)
          return
        }
        set({
          notice:
            state.subscription?.plan === plan &&
            state.subscription.interval === choice.interval
              ? "Your plan has changed."
              : "Your plan change is processing. Refresh billing to check it.",
        })
        await useWorkspaceStore.getState().load()
      } else {
        const { url } = await api.billing.checkout(choice)
        window.location.assign(url)
      }
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
  portal: async () => {
    if (get().busy) return
    set({ busy: true, error: null })
    try {
      const { url } = await api.billing.portal()
      window.location.assign(url)
    } catch (error) {
      set({ error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
}))
