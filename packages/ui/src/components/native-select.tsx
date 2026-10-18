import type { ComponentProps } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "cn"

function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex max-w-full min-w-0 items-center align-middle has-disabled:opacity-50">
      <select
        data-slot="native-select"
        className={cn(
          "h-8 w-full min-w-0 appearance-none rounded-md border bg-background py-1.5 pr-8 pl-2.5 text-sm leading-4 text-foreground transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 forced-colors:appearance-auto",
          className
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground forced-colors:hidden"
      />
    </span>
  )
}

export { NativeSelect }
