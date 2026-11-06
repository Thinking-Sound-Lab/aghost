import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A table that scrolls sideways on its own when it's wider than the page,
 * with each row headed by its first cell.
 */
export function CompareTable({
  caption,
  headings,
  rows,
  className,
}: {
  caption: string
  headings: string[]
  rows: ReactNode[][]
  /** Sets the table's minimum width, so wide tables scroll instead of squeezing. */
  className?: string
}) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgb(18_20_22/0.08)] outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <table
        className={cn(
          "w-full min-w-[34rem] border-collapse text-left text-[15px] leading-6",
          className
        )}
      >
        <caption className="px-4 py-3 text-left text-sm text-ink/65">
          {caption}
        </caption>
        <thead className="bg-ink/[0.03]">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-4 py-3 align-bottom font-medium text-ink"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-ink/10">
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th
                    key={cellIndex}
                    scope="row"
                    className="px-4 py-3 align-top font-medium text-ink"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={cellIndex}
                    className="px-4 py-3 align-top text-ink/75"
                  >
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
