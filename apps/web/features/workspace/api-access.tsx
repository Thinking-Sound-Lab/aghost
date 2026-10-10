"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Check, Copy, KeyRound } from "lucide-react"
import {
  API_KEY_NAME_MAX_LENGTH,
  type ApiKeyScope,
} from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  Loading,
} from "@/components/interface"
import { useAuthStore } from "@/stores/auth-store"
import { useApiKeysStore } from "@/stores/api-keys-store"
import { timeAgo } from "@/lib/format"

const permissions: { scope: ApiKeyScope; label: string }[] = [
  { scope: "workspace:read", label: "Read workspace" },
  { scope: "accounts:read", label: "Read Instagram accounts and posts" },
  {
    scope: "automations:read",
    label: "Read automations, statistics, and activity",
  },
  { scope: "contacts:read", label: "Read contacts" },
  { scope: "inbox:read", label: "Read inbox conversations and messages" },
  {
    scope: "automations:write",
    label: "Create, edit, activate, and delete automations",
  },
  { scope: "inbox:write", label: "Send Instagram messages" },
]

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      useApiKeysStore.setState({
        error: "Could not copy. Select the text and copy it manually.",
      })
    }
  }
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => void copy()}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  )
}

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

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        aghost: {
          type: "http",
          url: `${origin}/api/mcp`,
          headers: { Authorization: "Bearer YOUR_API_KEY" },
        },
      },
    },
    null,
    2
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    void store.create()
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Connect your AI agent</h2>
        <p className="text-sm text-muted-foreground">
          Give an agent access to this workspace through MCP or the API. Choose
          what it can read and change.
        </p>
        <div className="grid gap-1 rounded-lg border p-3 text-xs">
          <p>
            <span className="mr-3 text-muted-foreground">MCP</span>
            <code className="break-all">{origin}/api/mcp</code>
          </p>
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

      <form onSubmit={submit} className="grid gap-4">
        <h3 className="text-sm font-medium">Create an API key</h3>
        <label className="grid gap-1.5 text-sm">
          Name
          <Input
            required
            maxLength={API_KEY_NAME_MAX_LENGTH}
            placeholder="My AI agent"
            value={store.name}
            disabled={store.busy}
            onChange={(event) =>
              useApiKeysStore.setState({ name: event.target.value })
            }
          />
        </label>
        <fieldset className="grid gap-2.5" disabled={store.busy}>
          <legend className="mb-2 text-sm">Permissions</legend>
          {permissions.map(({ scope, label }) => (
            <label key={scope} className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-foreground"
                checked={store.scopes.includes(scope)}
                onChange={(event) =>
                  useApiKeysStore.setState({
                    scopes: event.target.checked
                      ? [...store.scopes, scope]
                      : store.scopes.filter((value) => value !== scope),
                  })
                }
              />
              {label}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            Activating automations and sending messages can deliver real DMs or
            public replies.
          </p>
        </fieldset>
        <label className="grid gap-1.5 text-sm">
          Expires after
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={store.expiresInDays}
            disabled={store.busy}
            onChange={(event) =>
              useApiKeysStore.setState({
                expiresInDays: Number(event.target.value),
              })
            }
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </label>
        <Button
          type="submit"
          className="justify-self-start"
          disabled={
            store.busy ||
            store.status !== "ready" ||
            !store.name.trim() ||
            store.scopes.length === 0 ||
            store.created !== null
          }
        >
          {store.busy ? "Working…" : "Create key"}
        </Button>
      </form>

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
                    <p className="mt-1 text-xs break-words text-muted-foreground">
                      {key.scopes.join(", ")}
                    </p>
                    {key.expiresAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expires {new Date(key.expiresAt).toLocaleDateString()}
                      </p>
                    )}
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
          <h3 className="text-sm font-medium">MCP configuration</h3>
          <CopyButton value={mcpConfig} label="Copy config" />
        </div>
        <p className="text-sm text-muted-foreground">
          For clients that support HTTP MCP with custom headers. Replace
          YOUR_API_KEY with your saved key.
        </p>
        <pre className="overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
          {mcpConfig}
        </pre>
        <p className="text-sm text-muted-foreground">
          For direct API calls, send{" "}
          <code className="text-xs">Authorization: Bearer YOUR_API_KEY</code>.
          The API reference is available at{" "}
          <code className="text-xs">/api/v1/openapi.json</code> with the same
          header.
        </p>
      </div>
    </section>
  )
}
