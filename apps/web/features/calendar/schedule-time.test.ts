import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { localInput, suggestedTime, zoneLabel } from "./schedule-time"

describe("the time a new post starts with", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }))
  afterEach(() => vi.useRealTimers())

  it("uses 10 AM on a day still to come", () => {
    vi.setSystemTime(new Date(2026, 9, 22, 15, 7))
    expect(suggestedTime("2026-10-25")).toBe("2026-10-25T10:00")
  })

  it("stays on today once 10 AM has passed, and on a day with no time left", () => {
    vi.setSystemTime(new Date(2026, 9, 22, 15, 7))
    expect(suggestedTime("2026-10-22")).toBe("2026-10-22T16:00")
    vi.setSystemTime(new Date(2026, 9, 22, 23, 52))
    // Too late to publish today, so the dialog asks for another day.
    expect(suggestedTime("2026-10-22")).toBe("2026-10-22T10:00")
  })

  it("starts at the next full hour without a day", () => {
    vi.setSystemTime(new Date(2026, 9, 22, 23, 52))
    expect(suggestedTime(null)).toBe(localInput(new Date(2026, 9, 23, 1, 0)))
  })

  it("reads the time zone as a place", () => {
    expect(zoneLabel("America/Los_Angeles")).toBe("America › Los Angeles")
  })
})
