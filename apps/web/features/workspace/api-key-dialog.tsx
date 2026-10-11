"use client"

import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { API_KEY_NAME_MAX_LENGTH } from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { ErrorBanner } from "@/components/interface"
import { useApiKeysStore } from "@/stores/api-keys-store"
import { CopyButton } from "./access-copy-button"

export function ApiKeyDialog() {
  const store = useApiKeysStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const nameId = useId()
  const copyRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open && store.created) copyRef.current?.focus()
  }, [open, store.created])

  function changeOpen(next: boolean) {
    if (store.busy) return
    setOpen(next)
    if (next) {
      setName("")
      useApiKeysStore.setState({ created: null, error: null })
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) void store.create(name.trim())
  }

  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
      onOpenChangeComplete={(next) => {
        if (!next) {
          setName("")
          useApiKeysStore.setState({ created: null, error: null })
        }
      }}
    >
      <DialogTrigger
        aria-label="Create API key"
        render={<Button disabled={store.busy || store.status !== "ready"} />}
      >
        <Plus />
        API key
      </DialogTrigger>
      <DialogContent showCloseButton={!store.busy}>
        {store.created ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your API key</DialogTitle>
              <DialogDescription>
                Copy and save this key now. It won&apos;t be shown again after
                you close this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <p className="text-sm font-medium break-all">
                {store.created.key.name}
              </p>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <code className="ph-no-capture min-w-0 flex-1 self-center font-mono text-xs break-all select-all">
                  {store.created.token}
                </code>
                <CopyButton
                  ref={copyRef}
                  value={store.created.token}
                  label="Copy key"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Keep it in your agent&apos;s secrets or environment variables.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={store.busy}
                onClick={() => changeOpen(false)}
              >
                I&apos;ve saved the key
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-6">
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Name this key so you can recognize which agent uses it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <label htmlFor={nameId} className="text-sm font-medium">
                Key name
              </label>
              <Input
                id={nameId}
                name="name"
                required
                maxLength={API_KEY_NAME_MAX_LENGTH}
                placeholder="e.g. Claude Code"
                autoComplete="off"
                disabled={store.busy}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <ErrorBanner message={store.error} />
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={store.busy}
                onClick={() => changeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={store.busy || !name.trim()}>
                {store.busy ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
