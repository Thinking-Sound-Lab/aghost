"use client"

import { useState, type Ref } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export function CopyButton({
  value,
  label,
  disabled = false,
  ref,
}: {
  value: string
  label: string
  disabled?: boolean
  ref?: Ref<HTMLButtonElement>
}) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  async function copy() {
    setCopied(false)
    setFailed(false)
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setFailed(true)
    }
  }
  return (
    <div className="grid shrink-0 gap-1">
      <Button
        ref={ref}
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : label}
      </Button>
      {failed && (
        <p role="status" className="max-w-32 text-xs text-destructive">
          Could not copy. Select the text and copy it manually.
        </p>
      )}
    </div>
  )
}
