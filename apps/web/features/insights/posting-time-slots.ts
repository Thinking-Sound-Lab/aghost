import {
  INSIGHT_TIMING_MIN_POSTS,
  type InsightTimingReport,
  type InsightTimingSlot,
} from "@workspace/api/contract"

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export type LocalPostingSlot = InsightTimingSlot & {
  key: string
  localDay: number
  localHour: number
  dayLabel: string
  dateLabel: string
  timeLabel: string
}

/** Convert each slot's next occurrence, including day rollover and DST. */
export function localPostingSlots(
  report: Extract<InsightTimingReport, { status: "ready" }>,
  timeZone: string
): LocalPostingSlot[] {
  const reference = new Date(report.referenceTime)
  const weekday = (reference.getUTCDay() + 6) % 7
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  })
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" })
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  })
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  })
  const zonedTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })
  return report.slots.map((slot) => {
    const start = new Date(reference)
    start.setUTCDate(start.getUTCDate() + ((slot.dayOfWeek - weekday + 7) % 7))
    start.setUTCHours(slot.hour, 0, 0, 0)
    if (start < reference) start.setUTCDate(start.getUTCDate() + 7)
    const end = new Date(start.getTime() + 3_600_000)
    const local = parts.formatToParts(start)
    const zoneName = (value: Date) =>
      zonedTime
        .formatToParts(value)
        .find((part) => part.type === "timeZoneName")?.value
    // During a clock change, name both offsets so 1 AM–1 AM is unambiguous.
    const clock = zoneName(start) === zoneName(end) ? time : zonedTime
    return {
      ...slot,
      key: `${slot.dayOfWeek}:${slot.hour}`,
      localDay: WEEKDAYS.indexOf(
        local.find((part) => part.type === "weekday")!.value
      ),
      localHour: Number(local.find((part) => part.type === "hour")!.value),
      dayLabel: day.format(start),
      dateLabel: date.format(start),
      timeLabel: `${clock.format(start)}–${clock.format(end)}`,
    }
  })
}

export function suggestedPostingSlots(slots: LocalPostingSlot[]) {
  return slots
    .filter(
      (slot) =>
        slot.postCount >= INSIGHT_TIMING_MIN_POSTS && slot.averageEngagement > 0
    )
    .sort(
      (a, b) =>
        b.averageEngagement - a.averageEngagement ||
        b.postCount - a.postCount ||
        a.dayOfWeek - b.dayOfWeek ||
        a.hour - b.hour
    )
    .slice(0, 3)
}
