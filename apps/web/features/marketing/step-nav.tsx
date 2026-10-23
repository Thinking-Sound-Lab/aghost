"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

/** The how-it-works steps, with the one on screen marked as you scroll. */
export function StepNav({ steps }: { steps: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(steps[0]?.id)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.find((entry) => entry.isIntersecting)
        if (seen) setCurrent(seen.target.id)
      },
      // A step counts once it crosses the middle of the window.
      { rootMargin: "-45% 0px -50% 0px" }
    )
    for (const step of steps) {
      const element = document.getElementById(step.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [steps])
  return (
    <nav aria-label="Steps" className="grid content-start">
      {steps.map((step, index) => (
        <a
          key={step.id}
          href={`#${step.id}`}
          aria-current={current === step.id ? "step" : undefined}
          className={cn(
            "flex items-center gap-3 border-b border-ink/10 py-4 text-[15px] text-ink/55 transition-colors hover:text-ink",
            current === step.id && "border-ink text-ink"
          )}
        >
          <span className="text-xs tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          {step.label}
          {current === step.id && (
            <ArrowRight aria-hidden="true" className="ml-auto size-4" />
          )}
        </a>
      ))}
    </nav>
  )
}
