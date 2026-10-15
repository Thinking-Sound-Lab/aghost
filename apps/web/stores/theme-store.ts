import { create } from "zustand"

export const THEMES = ["system", "light", "dark"] as const
export type Theme = (typeof THEMES)[number]

/** Where the choice is kept. The script in the root layout reads it too. */
export const THEME_KEY = "aghost-theme"

/** The saved choice; with none saved the dashboard follows the system. */
function saved(): Theme {
  if (typeof window === "undefined") return "system"
  const value = localStorage.getItem(THEME_KEY)
  return THEMES.find((theme) => theme === value) ?? "system"
}

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: saved(),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    set({ theme })
  },
}))
