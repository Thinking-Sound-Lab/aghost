import { create } from "zustand"
import { persist } from "zustand/middleware"

export const THEMES = ["system", "light", "dark"] as const
type Theme = (typeof THEMES)[number]

/** Where the choice is kept. The script in the root layout reads it too. */
export const THEME_KEY = "aghost-theme"

type ThemeState = {
  /** With no saved choice the dashboard follows the system. */
  theme: Theme
  setTheme: (theme: Theme) => void
}

/** Kept in this browser; where storage is blocked it lasts for the visit. */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: THEME_KEY }
  )
)
