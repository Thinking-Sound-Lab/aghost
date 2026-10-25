"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

/** The how-it-works steps, with the one on screen marked as you scroll. */
export function StepNav({ steps }: { steps: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(steps[0]?.id)
  useEffect(() => {
    let observer: IntersectionObserver | null = null
    // A step counts once it crosses the middle of the window. The margins
    // are pixels, worked out from the window's height, because browsers
    // differ on what a percentage margin is measured against.
    const watch = () => {
      observer?.disconnect()
      const height = window.innerHeight
      observer = new IntersectionObserver(
        (entries) => {
          const seen = entries.find((entry) => entry.isIntersecting)
          if (seen) setCurrent(seen.target.id)
        },
        {
          rootMargin: `-${Math.round(height * 0.45)}px 0px -${Math.round(height * 0.5)}px 0px`,
        }
      )
      for (const step of steps) {
        const element = document.getElementById(step.id)
        if (element) observer.observe(element)
      }
    }
    watch()
    window.addEventListener("resize", watch)
    return () => {
      window.removeEventListener("resize", watch)
      observer?.disconnect()
    }
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
