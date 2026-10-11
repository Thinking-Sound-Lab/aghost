import Image from "next/image"
import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"

/** The mascot, rendered at `size` CSS pixels. */
export function Mascot({
  size,
  alt = "",
  eager = false,
  className,
}: {
  size: number
  alt?: string
  /** For placements that are visible before any scrolling. */
  eager?: boolean
  className?: string
}) {
  return (
    <Image
      src="/mascot.png"
      alt={alt}
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      className={cn("shrink-0", className)}
    />
  )
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="aghost home"
      className="flex items-center gap-2 text-lg font-bold tracking-tight"
    >
      <Mascot size={28} eager />
      aghost
    </Link>
  )
}
