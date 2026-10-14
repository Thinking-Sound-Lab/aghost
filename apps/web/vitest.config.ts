import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // Store tests import shared TSX helpers; Next.js leaves JSX for its bundler.
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["stores/**/*.test.ts"] },
})
