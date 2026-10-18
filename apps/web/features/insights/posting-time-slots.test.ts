import { describe, expect, it } from "vitest"
import type { InsightTimingSlot } from "@workspace/api/contract"
import { localPostingSlots, suggestedPostingSlots } from "./posting-time-slots"

const base: InsightTimingSlot = {
  dayOfWeek: 0,
  hour: 9,
  averageEngagement: 100,
  postCount: 3,
}
function local(
  slots: InsightTimingSlot[],
  zone: string,
  referenceTime = "2026-10-19T00:00:00Z"
) {
  return localPostingSlots({ status: "ready", slots, referenceTime }, zone)
}

describe("posting-time suggestions", () => {
  it("keeps half-hour offsets and Sunday-to-Monday rollover", () => {
    const result = local(
      [base, { ...base, dayOfWeek: 6, hour: 21 }],
      "Asia/Kolkata"
    )
    expect(result[0]).toMatchObject({
      localDay: 0,
      localHour: 14,
      timeLabel: "2:30 PM–3:30 PM",
    })
    expect(result[1]).toMatchObject({
      localDay: 0,
      localHour: 2,
      dayLabel: "Monday",
      dateLabel: "Oct 26",
      timeLabel: "2:30 AM–3:30 AM",
    })
  })

  it("moves early UTC Monday to Sunday in a negative offset", () => {
    expect(
      local([{ ...base, hour: 1 }], "America/Los_Angeles")[0]
    ).toMatchObject({ localDay: 6, localHour: 18, dateLabel: "Oct 18" })
  })

  it("uses the next occurrence instead of a time that has already passed", () => {
    expect(local([base], "UTC", "2026-10-19T10:00:00Z")[0]).toMatchObject({
      dayLabel: "Monday",
      dateLabel: "Oct 26",
    })
  })

  it("names both offsets during a daylight saving clock change", () => {
    const slots = local(
      [{ ...base, dayOfWeek: 6, hour: 5 }],
      "America/New_York",
      "2026-10-31T00:00:00Z"
    )
    expect(slots[0]).toMatchObject({
      localDay: 6,
      localHour: 1,
      dateLabel: "Nov 1",
      timeLabel: "1:00 AM EDT–1:00 AM EST",
    })
  })

  it("excludes unsupported samples and zero engagement before ranking", () => {
    const slots = local(
      [
        { ...base, hour: 1, postCount: 1, averageEngagement: 999 },
        { ...base, hour: 2, averageEngagement: 0 },
        { ...base, hour: 3, averageEngagement: 50, postCount: 3 },
        { ...base, hour: 4, averageEngagement: 50, postCount: 8 },
        { ...base, hour: 5, averageEngagement: 20 },
        { ...base, hour: 6, averageEngagement: 10 },
      ],
      "UTC"
    )
    expect(suggestedPostingSlots(slots).map((slot) => slot.hour)).toEqual([
      4, 3, 5,
    ])
    expect(suggestedPostingSlots([])).toEqual([])
  })
})
