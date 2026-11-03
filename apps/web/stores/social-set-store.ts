import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Account, Automation, SocialSet } from "@workspace/api/contract"
import { useWorkspaceStore } from "./workspace-store"

type SocialSetState = {
  /** The set chosen in this browser; the first set when none is. */
  activeId: string | null
  choose: (id: string) => void
}

/** Which social set the dashboard shows, kept in this browser. */
export const useSocialSetStore = create<SocialSetState>()(
  persist(
    (set) => ({
      activeId: null,
      choose: (activeId) => set({ activeId }),
    }),
    { name: "aghost-social-set" }
  )
)

/** The chosen set, or the first one when the choice is gone or never made. */
function activeSetOf(
  sets: SocialSet[],
  activeId: string | null
): SocialSet | null {
  return sets.find((item) => item.id === activeId) ?? sets[0] ?? null
}

/** The set the dashboard shows, for code outside components. */
export function currentSet(): SocialSet | null {
  return activeSetOf(
    useWorkspaceStore.getState().socialSets,
    useSocialSetStore.getState().activeId
  )
}

/** The accounts in a set. */
export function accountsIn(
  accounts: Account[],
  set: SocialSet | null
): Account[] {
  return set ? accounts.filter((account) => account.socialSetId === set.id) : []
}

/** The automations that run on a set's Instagram accounts. */
export function automationsIn(
  automations: Automation[],
  accounts: Account[],
  set: SocialSet | null
): Automation[] {
  const ids = new Set(accountsIn(accounts, set).map((account) => account.id))
  return automations.filter((item) => ids.has(item.instagramAccountId))
}

/** The set the dashboard shows. */
export function useActiveSet(): SocialSet | null {
  const sets = useWorkspaceStore((state) => state.socialSets)
  const activeId = useSocialSetStore((state) => state.activeId)
  return activeSetOf(sets, activeId)
}
