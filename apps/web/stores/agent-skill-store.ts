import { create } from "zustand"
import { api } from "@/lib/api"
import { errorMessage } from "./workspace-store"

type AgentSkillState = {
  content: string
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  load: () => Promise<void>
  reset: () => void
}

const initial = { content: "", status: "idle" as const, error: null }
let generation = 0

export const useAgentSkillStore = create<AgentSkillState>((set) => ({
  ...initial,
  reset: () => {
    generation++
    set(initial)
  },
  load: async () => {
    const current = ++generation
    set({ status: "loading", error: null, content: "" })
    try {
      const content = await api.mcp.skill()
      if (current === generation) set({ content, status: "ready" })
    } catch (error) {
      if (current === generation)
        set({ status: "error", error: errorMessage(error) })
    }
  },
}))
