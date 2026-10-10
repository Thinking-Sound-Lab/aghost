import Link from "next/link"
import { Ghost } from "lucide-react"

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="aghost home"
      className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
    >
      <span className="grid size-7 place-items-center rounded-lg bg-[#2456d8] text-white">
        <Ghost className="size-4" strokeWidth={2.4} />
      </span>
      aghost
    </Link>
  )
}
