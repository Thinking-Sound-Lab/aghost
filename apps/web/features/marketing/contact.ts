/** Public address supplied by the operator for support and privacy requests. */
export const contactEmail = "abhishek@thinkingsoundlab.com"

export function contactHref(subject?: string) {
  return `mailto:${contactEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
}
