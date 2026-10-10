import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    maxWorkers: 1,
    // These tests make real requests to the local Docker database and auth API.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
})
