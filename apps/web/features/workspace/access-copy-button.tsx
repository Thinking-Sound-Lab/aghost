"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export function CopyButton({ value, label }: { value: string; label: string }) {
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
    <div className="grid gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : label}
      </Button>
      {failed && (
        <p role="status" className="text-xs text-destructive">
          Could not copy. Select the text and copy it manually.
        </p>
      )}
    </div>
  )
}
