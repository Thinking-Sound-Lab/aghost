import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Synthesis fingerprints the API's Docker build context.
    testTimeout: 30_000,
  },
})
