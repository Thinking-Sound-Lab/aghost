"use client"

import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { ErrorBanner } from "@/components/interface"
import { useAgentSkillStore } from "@/stores/agent-skill-store"
import { CopyButton } from "./access-copy-button"

export function McpAccess() {
  const [origin, setOrigin] = useState("")
  useEffect(() => setOrigin(window.location.origin), [])
  const skill = useAgentSkillStore()
  const { load, reset } = skill
  useEffect(() => {
    void load()
    return reset
  }, [load, reset])

  const url = `${origin}/api/mcp`
  const config = JSON.stringify(
    {
      mcpServers: {
        aghost: {
          type: "http",
          url,
          headers: { Authorization: "Bearer YOUR_API_KEY" },
        },
      },
    },
    null,
    2
  )

  return (
    <section className="grid gap-8">
      <div className="grid gap-3">
        <h2 className="text-sm font-medium">Connect with sign-in</h2>
        <p className="text-sm text-muted-foreground">
          Apps that sign in, such as Claude, need only this address. In Claude,
          add it under Customize → Connectors → Add custom connector, then
          choose Allow in aghost.
        </p>
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <pre className="min-w-0 flex-1 overflow-auto text-xs">{url}</pre>
          <CopyButton value={url} label="Copy URL" />
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="text-sm font-medium">Let your agent set this up</h2>
        <p className="text-sm text-muted-foreground">
          Paste this skill into Claude Code, Codex, Cursor, or another agent. It
          includes this app&apos;s address and guides your agent through
          configuring the connection with your API key.
        </p>
        <ErrorBanner message={skill.error} />
        <div className="flex flex-wrap items-start gap-2">
          <CopyButton
            value={skill.content}
            label={skill.status === "loading" ? "Loading skill…" : "Copy skill"}
            disabled={skill.status !== "ready"}
          />
          {skill.status === "error" && (
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="text-sm font-medium">MCP configuration</h2>
        <p className="text-sm text-muted-foreground">
          Add this configuration to a client that supports HTTP MCP with custom
          headers. Replace YOUR_API_KEY with your saved key.
        </p>
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <pre className="min-w-0 flex-1 overflow-auto text-xs">{config}</pre>
          <CopyButton value={config} label="Copy config" />
        </div>
      </div>
    </section>
  )
}
