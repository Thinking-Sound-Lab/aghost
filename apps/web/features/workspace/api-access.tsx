"use client"

import { useEffect, useState } from "react"
import { KeyRound, Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  Loading,
} from "@/components/interface"
import { useAuthStore } from "@/stores/auth-store"
import { useApiKeysStore } from "@/stores/api-keys-store"
import { timeAgo } from "@/lib/format"
import { CopyButton } from "./access-copy-button"

export function ApiAccess() {
  const store = useApiKeysStore()
  const userId = useAuthStore((state) => state.user?.id)
  const [origin, setOrigin] = useState("")
  const { load, reset } = store
  useEffect(() => {
    reset()
    setOrigin(window.location.origin)
    void load()
    return reset
  }, [userId, load, reset])

  const example = `curl ${origin}/api/v1/automations \\\n  -H 'Authorization: Bearer YOUR_API_KEY'`

  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">API access</h2>
          <Button
            type="button"
            aria-label="Create API key"
            disabled={
              store.busy || store.status !== "ready" || store.created !== null
            }
            onClick={() => void store.create()}
          >
            <Plus />
            API key
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Use API keys to let agents access and manage this workspace. Keys work
          until you revoke them.
        </p>
        <div className="grid gap-1 rounded-lg border p-3 text-xs">
          <p>
            <span className="mr-3 text-muted-foreground">API</span>
            <code className="break-all">{origin}/api/v1</code>
          </p>
        </div>
      </div>

      <ErrorBanner message={store.error} />
      {store.created && (
        <div
          role="status"
          className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Save your new key</h3>
            <CopyButton
              key={store.created.key.id}
              value={store.created.token}
              label="Copy key"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            This is the only time the full key is shown. Keep it in your
            agent&apos;s secrets or environment variables.
          </p>
          <code className="rounded bg-background p-3 font-mono text-xs break-all select-all">
            {store.created.token}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => useApiKeysStore.setState({ created: null })}
          >
            I&apos;ve saved the key
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        <h3 className="text-sm font-medium">Workspace keys</h3>
        {store.status === "loading" || store.status === "idle" ? (
          <Loading />
        ) : store.status === "error" ? (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => void store.load()}
          >
            Retry
          </Button>
        ) : store.keys.length === 0 ? (
          <EmptyState icon={<KeyRound />} title="No API keys yet" />
        ) : (
          <div className="divide-y">
            {store.keys.map((key) => {
              const expired =
                key.expiresAt !== null &&
                new Date(key.expiresAt).getTime() <= Date.now()
              return (
                <div key={key.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{key.prefix}…</code> ·{" "}
                      {key.revokedAt
                        ? "Revoked"
                        : expired
                          ? "Expired"
                          : key.lastUsedAt
                            ? `Used ${timeAgo(key.lastUsedAt)}`
                            : "Never used"}
                    </p>
                  </div>
                  {!key.revokedAt && (
                    <ConfirmButton
                      title={`Revoke ${key.name}?`}
                      description="Agents using this key lose access immediately."
                      confirmLabel="Revoke key"
                      busy={store.busy}
                      onConfirm={() => store.revoke(key.id)}
                    >
                      Revoke
                    </ConfirmButton>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Make an API request</h3>
          <CopyButton value={example} label="Copy request" />
        </div>
        <p className="text-sm text-muted-foreground">
          Send your saved key in the Authorization header. Replace YOUR_API_KEY
          in this example to list your automations.
        </p>
        <pre className="overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
          {example}
        </pre>
        <p className="text-sm text-muted-foreground">
          The OpenAPI reference is available at{" "}
          <code className="text-xs break-all">
            {origin}/api/v1/openapi.json
          </code>{" "}
          with the same Authorization header.
        </p>
      </div>
    </section>
  )
}
