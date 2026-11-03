import { POST_LIMITS } from "@workspace/api/contract"

const pad = (value: number) => String(value).padStart(2, "0")

/** A date as a datetime-local input's value. */
export function localInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** The earliest moment the API accepts a post for. */
export function earliestPost(): Date {
  return new Date(Date.now() + POST_LIMITS.minLeadMinutes * 60_000)
}

/**
 * When a new post goes out. On a day chosen in the calendar: 10:00, or the
 * next full hour once 10:00 has passed, and failing that the next five
 * minutes. It stays on that day, even when the day has no time left. Without
 * a day: the next full hour.
 */
export function suggestedTime(day: string | null): string {
  // A margin to finish writing, beyond the API's own lead time.
  const ready = new Date(earliestPost().getTime() + 5 * 60_000)
  const hour = new Date(ready)
  hour.setHours(hour.getHours() + 1, 0, 0, 0)
  if (!day) return localInput(hour)
  const morning = new Date(`${day}T10:00`)
  const minutes = new Date(ready)
  minutes.setMinutes(Math.ceil(minutes.getMinutes() / 5) * 5, 0, 0)
  const choice = [morning, hour, minutes].find(
    (time) => time >= ready && localInput(time).startsWith(day)
  )
  return localInput(choice ?? morning)
}

/** "Asia › Kolkata", as the time zone reads in a sentence. */
export function zoneLabel(timeZone: string): string {
  return timeZone.replaceAll("_", " ").split("/").join(" › ")
}
