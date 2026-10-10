const relative = new Intl.RelativeTimeFormat("en", { style: "narrow" })
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

/** "5m ago", "2d ago", "now". */
export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of units)
    if (Math.abs(seconds) >= size)
      return relative.format(Math.round(seconds / size), unit)
  return "now"
}

/** Lifetime counters: null means the provider has not reported one. */
export function count(value: number | null | undefined): string {
  return value == null ? "—" : value.toLocaleString()
}
