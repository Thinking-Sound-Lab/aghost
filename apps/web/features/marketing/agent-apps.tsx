import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  House,
  Infinity as InfinityIcon,
  Loader,
  MessageSquare,
  Mic,
  Pin,
  Plus,
  SquarePen,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

// Each agent as it really looks while it works with aghost: Claude Code in a
// terminal, the Codex app, and Cursor Desktop. Decorative, like the other
// pictures; the card beside each one says the same thing in words.

function TrafficLights() {
  return (
    <span className="flex gap-1.5">
      <span className="size-2.5 rounded-full bg-[#ff5f57]" />
      <span className="size-2.5 rounded-full bg-[#febc2e]" />
      <span className="size-2.5 rounded-full bg-[#28c840]" />
    </span>
  )
}

function TitleBar({ title, dark = false }: { title: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-8 shrink-0 items-center px-3",
        dark
          ? "border-b border-black/50 bg-[#2a2a2a]"
          : "border-b border-black/5 bg-[#f6f6f4]"
      )}
    >
      <TrafficLights />
      <span
        className={cn(
          "absolute inset-x-16 truncate text-center font-sans text-[11px] font-semibold",
          dark ? "text-[#a5a5a5]" : "text-black/55"
        )}
      >
        {title}
      </span>
    </div>
  )
}

/** Claude Code's mascot, as the start banner draws it in block characters. */
function Clawd() {
  const rows = [
    "...XXXXXXXXXXXX...",
    "...XX.XXXXXX.XX...",
    ".XXXXXXXXXXXXXXXX.",
    "...XXXXXXXXXXXX...",
    "....X.X....X.X....",
  ]
  return (
    <svg
      viewBox="0 0 18 10"
      shapeRendering="crispEdges"
      className="mx-auto h-6 w-[2.7rem]"
    >
      {rows.flatMap((row, y) =>
        row
          .split("")
          .map((pixel, x) =>
            pixel === "X" ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y * 2}
                width="1.05"
                height="2.05"
                fill="#d77757"
              />
            ) : null
          )
      )}
    </svg>
  )
}

function ClaudeTool({
  name,
  args,
  result,
}: {
  name: string
  args: string
  result: string
}) {
  return (
    <div>
      <p className="flex min-w-0">
        <span className="w-[2ch] shrink-0 text-[#4eba65]">⏺</span>
        <span className="truncate">
          <b>aghost - {name}</b> (MCP)({args})
        </span>
      </p>
      <p className="flex min-w-0 text-[#8a8a8a]">
        <span className="w-[5ch] shrink-0 pl-[2ch]">⎿</span>
        <span className="truncate">{result}</span>
      </p>
    </div>
  )
}

/** Claude Code 2.1 in a macOS terminal: the banner, a request, two calls. */
export function ClaudeCodeApp() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl bg-[#161616] font-mono text-[10.5px] leading-[1.7] text-[#e8e8e8] shadow-2xl ring-1 shadow-black/40 ring-white/10 sm:text-[11.5px]"
    >
      <TitleBar dark title="studio — claude — 96×28" />
      <div className="grid grid-cols-1 gap-2.5 p-4">
        <div className="relative mt-1.5 grid grid-cols-[minmax(0,1.1fr)_1px_minmax(0,1fr)] rounded-md border border-[#d77757]">
          <span className="absolute -top-2.5 left-3 bg-[#161616] px-1.5">
            <span className="text-[#d77757]">Claude Code</span>
            <span className="text-[#8a8a8a]"> v2.1.287</span>
          </span>
          <div className="grid gap-1 px-2 pt-4 pb-2 text-center">
            <b>Welcome back!</b>
            <Clawd />
            <span className="text-[#8a8a8a]">Opus 5.5 · Claude Max</span>
            <span className="text-[#8a8a8a]">~/studio</span>
          </div>
          <span className="my-2 bg-[#d77757]/80" />
          <div className="min-w-0 px-3 pt-4 pb-2">
            <b className="text-[#d77757]">Tips for getting started</b>
            <p className="truncate">Run /init to create a CLAUDE.md</p>
            <span className="my-1.5 block border-t border-[#d77757]/80" />
            <b className="text-[#d77757]">Recent activity</b>
            <p className="text-[#8a8a8a]">No recent activity</p>
          </div>
        </div>
        <p className="flex bg-white/[0.07] text-[#c9c9c9]">
          <span className="w-[2ch] shrink-0">&gt;</span>
          Create a paused GUIDE automation for my latest reel
        </p>
        <ClaudeTool
          name="list_account_posts"
          args='accountId: "…"'
          result="Found 12 posts. Latest: “Morning routine” (reel)"
        />
        <ClaudeTool
          name="create_automation"
          args='name: "Send the guide", status: "paused"'
          result="Created “Send the guide” · paused"
        />
        <p className="flex">
          <span className="w-[2ch] shrink-0">⏺</span>
          <span>“Send the guide” is ready and paused for your review.</span>
        </p>
        <div>
          <span className="block border-t border-[#5c5c5c]" />
          <p className="py-0.5">&gt;</p>
          <span className="block border-t border-[#5c5c5c]" />
          <p className="pl-[2ch] text-[#8a8a8a]">? for shortcuts</p>
        </div>
      </div>
    </div>
  )
}

function CodexCall({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-1.5 text-black/45">
      <ChevronRight className="size-3" />
      Called <span className="font-medium text-black/70">aghost.{name}</span>
    </p>
  )
}

/** The Codex app: its sidebar, a question about stats, and the answer. */
export function CodexApp() {
  const stats = [
    ["Comments", "512"],
    ["DMs sent", "498"],
    ["Link clicks", "214"],
    ["Failed", "2"],
  ]
  return (
    <div
      aria-hidden
      className="@container flex flex-col overflow-hidden rounded-xl bg-white font-sans text-[11.5px] text-black shadow-2xl ring-1 shadow-black/30 ring-black/10"
    >
      <TitleBar title="GUIDE automation stats" />
      <div className="grid min-h-72 grid-cols-[minmax(0,1fr)] @min-[28rem]:grid-cols-[1.75rem_8.5rem_minmax(0,1fr)]">
        <div className="hidden content-start justify-items-center gap-3 bg-[#f4f4f3] pt-3 text-black/45 @min-[28rem]:grid [&_svg]:size-3.5">
          <House className="text-black" />
          <Clock />
          <BookOpen />
          <MessageSquare />
        </div>
        <div className="hidden content-start gap-1 border-r border-black/5 bg-[#f4f4f3] px-2 pt-2.5 @min-[28rem]:grid">
          <p className="flex items-center gap-1 px-1.5 text-[13px] font-semibold">
            Codex <ChevronDown className="size-3 text-black/45" />
          </p>
          <p className="mt-1 flex items-center gap-1.5 rounded-md px-1.5 py-1">
            <SquarePen className="size-3" /> New chat
          </p>
          <p className="mt-1 px-1.5 font-medium text-black/45">Pinned</p>
          <p className="flex items-center gap-1.5 truncate px-1.5 py-0.5">
            <Pin className="size-3 shrink-0" /> Guide automation
          </p>
          <p className="mt-1 px-1.5 font-medium text-black/45">Recents</p>
          <p className="truncate rounded-md bg-black/[0.07] px-1.5 py-1">
            GUIDE automation stats
          </p>
          <p className="truncate px-1.5 py-0.5">Reply to new DMs</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2.5 p-3.5">
          <p className="ml-auto max-w-[85%] rounded-2xl bg-[#f0f0ef] px-3 py-2">
            How did my GUIDE automation do this week?
          </p>
          <div className="grid gap-1">
            <CodexCall name="list_automations" />
            <CodexCall name="get_automation_stats" />
          </div>
          <p>Here’s “Send the guide” for the last 7 days:</p>
          <div className="grid grid-cols-2 gap-1.5 @min-[20rem]:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#f6f6f5] px-2 py-1.5">
                <p className="truncate text-[10px] text-black/50">{label}</p>
                <p className="text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-2xl p-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/10">
            <p className="text-black/40">Ask for follow-up changes</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full ring-1 ring-black/15">
                <Plus className="size-3" />
              </span>
              <Mic className="ml-auto size-3.5 text-black/50" />
              <span className="grid size-6 place-items-center rounded-full bg-black text-white">
                <ArrowUp className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Cursor Desktop: the agent's task list, and the task it is working on. */
export function CursorApp() {
  return (
    <div
      aria-hidden
      className="@container flex flex-col overflow-hidden rounded-xl bg-white font-sans text-[11.5px] text-[#26251e] shadow-2xl ring-1 shadow-black/30 ring-black/10"
    >
      <TitleBar title="Cursor Desktop" />
      <div className="grid min-h-72 grid-cols-[minmax(0,1fr)] @min-[28rem]:grid-cols-[10.5rem_minmax(0,1fr)]">
        <div className="hidden content-start gap-1 border-r border-black/5 bg-[#f7f7f4] p-2.5 @min-[28rem]:grid">
          <p className="text-[10px] font-medium tracking-wide text-black/45">
            IN PROGRESS 1
          </p>
          <div className="flex gap-1.5 rounded-md bg-black/5 p-1.5">
            <Loader className="mt-0.5 size-3 shrink-0 text-black/45" />
            <span className="min-w-0">
              <span className="block truncate">Reply to Sarah</span>
              <span className="block text-[10px] text-black/45">
                Sending DM
              </span>
            </span>
          </div>
          <p className="mt-2 text-[10px] font-medium tracking-wide text-black/45">
            READY FOR REVIEW 2
          </p>
          {[
            ["Guide automation", "10m"],
            ["Weekly DM stats", "30m"],
          ].map(([task, age]) => (
            <div key={task} className="flex gap-1.5 p-1.5">
              <Check className="mt-0.5 size-3 shrink-0 rounded-full text-black/45 ring-1 ring-black/30" />
              <span className="min-w-0 flex-1 truncate">{task}</span>
              <span className="text-[10px] text-black/40">{age}</span>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-2 p-3">
          <p className="font-semibold">Reply to Sarah</p>
          <p className="rounded-md bg-white px-2.5 py-2 ring-1 ring-black/10">
            Reply to Sarah’s DM with the booking link
          </p>
          <p className="text-black/45">
            Called <span className="text-black/70">aghost</span>{" "}
            list_conversations
          </p>
          <p className="text-black/45">
            Called <span className="text-black/70">aghost</span> send_message
          </p>
          <p>
            Sent to <b>sarah</b>: “Here’s the booking link ✨ See you there!”
          </p>
          <div className="mt-auto rounded-lg p-2 ring-1 ring-black/10">
            <p className="text-black/40">Plan, search, build anything…</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px]">
                <InfinityIcon className="size-3" /> Agent
                <ChevronDown className="size-2.5" />
              </span>
              <span className="ml-auto grid size-5 place-items-center rounded-full bg-black/10">
                <ArrowUp className="size-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The MCP entry in an editor, as you would add it to any client. */
export function McpConfigApp({ endpoint }: { endpoint: string }) {
  const lines: ["k" | "s" | "p", string][][] = [
    [["p", "{"]],
    [
      ["k", '  "mcpServers"'],
      ["p", ": {"],
    ],
    [
      ["k", '    "aghost"'],
      ["p", ": {"],
    ],
    [
      ["k", '      "type"'],
      ["p", ": "],
      ["s", '"http"'],
      ["p", ","],
    ],
    [
      ["k", '      "url"'],
      ["p", ": "],
      ["s", `"${endpoint}"`],
      ["p", ","],
    ],
    [
      ["k", '      "headers"'],
      ["p", ": {"],
    ],
    [
      ["k", '        "Authorization"'],
      ["p", ": "],
      ["s", '"Bearer ${AGHOST_API_KEY}"'],
    ],
    [["p", "      }"]],
    [["p", "    }"]],
    [["p", "  }"]],
    [["p", "}"]],
  ]
  const colors = { k: "text-[#9cdcfe]", s: "text-[#ce9178]", p: "" }
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl bg-[#1e1e1e] font-mono text-[10.5px] leading-[1.8] text-[#d4d4d4] shadow-2xl ring-1 shadow-black/40 ring-white/10 sm:text-[11.5px]"
    >
      <TitleBar dark title=".mcp.json — studio" />
      <div className="flex border-b border-black/40 bg-[#252526] text-[10.5px]">
        <span className="border-t-2 border-[#0e7cf0] bg-[#1e1e1e] px-3 py-1.5 text-white">
          .mcp.json
        </span>
        <span className="px-3 py-1.5 text-white/40">README.md</span>
      </div>
      <div className="py-3">
        {lines.map((tokens, index) => (
          <p key={index} className="flex min-w-0">
            <span className="w-9 shrink-0 pr-3 text-right text-[#858585]">
              {index + 1}
            </span>
            <span className="truncate whitespace-pre">
              {tokens.map(([kind, text], token) => (
                <span key={token} className={colors[kind]}>
                  {text}
                </span>
              ))}
            </span>
          </p>
        ))}
      </div>
    </div>
  )
}
