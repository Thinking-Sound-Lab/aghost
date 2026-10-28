/** The days a month's grid shows: whole weeks, from Sunday. */
export function daysOf(month: Date): Date[] {
  const year = month.getFullYear()
  const index = month.getMonth()
  const lead = new Date(year, index, 1).getDay()
  const length = new Date(year, index + 1, 0).getDate()
  const weeks = Math.ceil((lead + length) / 7)
  return Array.from(
    { length: weeks * 7 },
    (_, day) => new Date(year, index, 1 - lead + day)
  )
}

const pad = (value: number) => String(value).padStart(2, "0")

/** A local day as YYYY-MM-DD, for links and grouping. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
