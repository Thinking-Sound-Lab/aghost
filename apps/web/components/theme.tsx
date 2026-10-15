"use client"

import { useLayoutEffect } from "react"
import { THEME_KEY, useThemeStore } from "@/stores/theme-store"

const SYSTEM_DARK = "(prefers-color-scheme: dark)"

/**
 * The same rule as below, run while the page is parsed so it never flashes.
 * It reads the JSON that zustand saves the store as. A browser that blocks
 * storage has no saved choice, as for the store, so the system decides.
 */
const beforePaint = `(function () {
  var saved = null
  try {
    saved = localStorage.getItem("${THEME_KEY}")
  } catch (blocked) {}
  var theme = JSON.parse(saved)?.state.theme
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark" || (theme !== "light" && matchMedia("${SYSTEM_DARK}").matches)
  )
})()`

/** Keeps the page dark or light as chosen, and in step with the device on "system". */
export function Theme() {
  const theme = useThemeStore((state) => state.theme)
  useLayoutEffect(() => {
    const system = matchMedia(SYSTEM_DARK)
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme !== "light" && system.matches)
      )
    apply()
    system.addEventListener("change", apply)
    return () => system.removeEventListener("change", apply)
  }, [theme])
  // The browser runs the script from the server's HTML; React runs none it renders.
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: beforePaint }}
    />
  )
}
