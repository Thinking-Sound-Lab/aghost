"use client"

import { useEffect, useState } from "react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
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

  const config = JSON.stringify(
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

  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Connect with MCP</h2>
        <p className="text-sm text-muted-foreground">
          Connect your AI agent to manage automations and check activity using
          MCP tools.
        </p>
        <div className="rounded-lg border p-3 text-xs">
          <span className="mr-3 text-muted-foreground">MCP endpoint</span>
          <code className="break-all">{origin}/api/mcp</code>
        </div>
      </div>

      <div className="grid justify-items-start gap-3">
        <h3 className="text-sm font-medium">Create an API key</h3>
        <p className="text-sm text-muted-foreground">
          Click + API key in the API tab, give it a name, and save the key shown
          in the dialog before returning here. The same key connects your agent
          through API or MCP. Revoking the key stops access immediately.
        </p>
        <a href="#api" className={buttonVariants({ variant: "secondary" })}>
          Manage API keys
        </a>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-medium">MCP configuration</h3>
        <p className="text-sm text-muted-foreground">
          Add this configuration to a client that supports HTTP MCP with custom
          headers. Replace YOUR_API_KEY with your saved key.
        </p>
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <pre className="min-w-0 flex-1 overflow-auto text-xs">{config}</pre>
          <CopyButton value={config} label="Copy config" />
        </div>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-medium">Let your agent set this up</h3>
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
    </section>
  )
}
