"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
  PanelLeft,
  Plus,
} from "lucide-react"
import {
  INSIGHT_PERIODS,
  PLATFORMS,
  type Account,
  type AutomationStatus,
  type InsightPeriod,
  type InsightQuery,
} from "@workspace/api/contract"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { cn } from "@workspace/ui/lib/utils"
import { Mascot } from "@/components/brand"
import {
  Avatar,
  EmptyState,
  Page,
  Panel,
  PanelHeader,
  SearchInput,
} from "@/components/interface"
import {
  AutomationTable,
  AutomationTotals,
  type AutomationRow,
} from "@/features/automations/automation-table"
import { MonthGrid } from "@/features/calendar/month-grid"
import { ConversationButton, Thread } from "@/features/inbox/conversation"
import { ChannelOverview } from "@/features/insights/channel-overview"
import {
  ChannelSummary,
  ChannelTabs,
  InstagramSummary,
  PostDialog,
  ReportNote,
} from "@/features/insights/channel-report"
import { ContentPerformance } from "@/features/insights/content-performance"
import {
  NAV_ITEM,
  NAV_ITEM_ACTIVE,
  navigation,
} from "@/features/workspace/navigation"
import { SocialSetMenu } from "@/features/workspace/social-set-menu"
import { count } from "@/lib/format"
import {
  DEMO_OWNER,
  DEMO_SETS,
  accountsOf,
  calendarOf,
  inboxOf,
  overviewOf,
  postReportOf,
  reportOf,
  type DemoSet,
} from "./demo-data"

/** Menus and dialogs render outside the sample, so they take its theme too. */
const THEME = "app-light"

// Settings needs an account of one's own.
const PAGES = navigation.filter((item) => item.href !== "/settings")

const monthName = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
})

function Brand() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <Mascot size={28} />
      aghost
    </span>
  )
}

function platformsOf(set: DemoSet) {
  return PLATFORMS.filter((platform) =>
    set.channels.some((channel) => channel.platform === platform)
  )
}

function Sidebar({
  set,
  page,
  onSet,
  onPage,
}: {
  set: DemoSet
  page: string
  onSet: (id: string) => void
  onPage: (page: string) => void
}) {
  return (
    <>
      <div className="flex h-11 shrink-0 items-center justify-between px-2.5 md:h-9">
        <Brand />
      </div>
      <div className="mt-6 md:mt-8">
        <SocialSetMenu
          name={set.name}
          value={set.id}
          sets={DEMO_SETS}
          platforms={platformsOf(set)}
          onChoose={onSet}
          contentClassName={THEME}
        />
      </div>
      <nav
        aria-label="Sample dashboard"
        className="mt-4 grid gap-1 overflow-y-auto md:gap-px"
      >
        {PAGES.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            type="button"
            aria-current={page === href ? "page" : undefined}
            onClick={() => onPage(href)}
            className={cn(NAV_ITEM, page === href && NAV_ITEM_ACTIVE)}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto grid shrink-0 gap-px pt-4">
        <div
          className={cn(
            NAV_ITEM,
            "h-12 w-full min-w-0 px-2 text-foreground hover:bg-transparent md:h-12 dark:hover:bg-transparent"
          )}
        >
          <Avatar
            src={null}
            name={DEMO_OWNER}
            className="size-8 bg-card ring-1 ring-border"
          />
          <span className="min-w-0 flex-1 truncate font-medium">
            {DEMO_OWNER}
          </span>
        </div>
      </div>
    </>
  )
}

/** Narrow screens: the sidebar's choices in a menu. */
function MobileNavigation({
  set,
  page,
  onSet,
  onPage,
}: {
  set: DemoSet
  page: string
  onSet: (id: string) => void
  onPage: (page: string) => void
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b bg-sidebar px-3 py-2 md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Open menu"
            />
          }
        >
          <PanelLeft aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className={cn("w-56", THEME)}>
          <DropdownMenuRadioGroup value={set.id} onValueChange={onSet}>
            <DropdownMenuLabel>Social sets</DropdownMenuLabel>
            {DEMO_SETS.map((item) => (
              <DropdownMenuRadioItem key={item.id} value={item.id} closeOnClick>
                {item.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={page} onValueChange={onPage}>
            <DropdownMenuLabel>Pages</DropdownMenuLabel>
            {PAGES.map(({ href, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={href} value={href} closeOnClick>
                <Icon aria-hidden="true" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Brand />
    </header>
  )
}

function Period({
  days,
  onPeriod,
}: {
  days: InsightPeriod
  onPeriod: (days: InsightPeriod) => void
}) {
  return (
    <>
      <label className="sr-only" htmlFor="demo-period">
        Period
      </label>
      <NativeSelect
        id="demo-period"
        value={days}
        onChange={(event) =>
          onPeriod(Number(event.target.value) as InsightPeriod)
        }
      >
        {INSIGHT_PERIODS.map((days) => (
          <option key={days} value={days}>
            Last {days} days
          </option>
        ))}
      </NativeSelect>
    </>
  )
}

function HomePage({
  set,
  accounts,
  automations,
  now,
  days,
  onPeriod,
  onToggle,
  onPage,
}: {
  set: DemoSet
  accounts: Account[]
  automations: AutomationRow[]
  now: number
  days: InsightPeriod
  onPeriod: (days: InsightPeriod) => void
  onToggle: (id: string) => void
  onPage: (page: string) => void
}) {
  const total = (key: "dmsSent" | "linkClicks") =>
    count(automations.reduce((sum, item) => sum + (item[key] ?? 0), 0))
  return (
    <Page
      heading="h2"
      title={`Welcome, ${DEMO_OWNER.split(" ")[0]}`}
      actions={
        <>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "secondary",
              className: "max-sm:hidden",
            })}
          >
            New automation
          </Link>
          <Link href="/login" className={buttonVariants()}>
            <Plus />
            New post
          </Link>
        </>
      }
    >
      <section
        className="grid grid-cols-[minmax(0,1fr)] gap-6"
        aria-labelledby="demo-overview-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="demo-overview-heading" className="text-sm font-semibold">
            {set.name}
          </h3>
          <div className="flex items-center gap-3">
            <Period days={days} onPeriod={onPeriod} />
            <button
              type="button"
              onClick={() => onPage("/analytics")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Analytics
            </button>
          </div>
        </div>
        <ChannelOverview
          overview={overviewOf(set, days, now)}
          days={days}
          accounts={accounts}
        />
      </section>
      <section
        className="grid grid-cols-[minmax(0,1fr)] gap-4"
        aria-labelledby="demo-automations-heading"
      >
        <div className="flex items-center justify-between">
          <h3 id="demo-automations-heading" className="text-sm font-semibold">
            Automations
          </h3>
          <button
            type="button"
            onClick={() => onPage("/automations")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </button>
        </div>
        <AutomationTotals
          active={count(
            automations.filter((item) => item.status === "active").length
          )}
          dmsSent={total("dmsSent")}
          linkClicks={total("linkClicks")}
        />
        <AutomationTable
          rows={automations.slice(0, 5)}
          busy={false}
          onToggle={onToggle}
        />
      </section>
      <section className="flex flex-wrap items-center gap-4">
        <div className="mr-auto grid gap-1">
          <h3 className="text-sm font-semibold">Work with your agent</h3>
          <p className="text-sm text-muted-foreground">
            Connect through MCP or use the REST API in your own workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/agents"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Set up MCP
          </Link>
          <Link
            href="/agents"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            API access
          </Link>
        </div>
      </section>
    </Page>
  )
}

function AutomationsPage({
  automations,
  onToggle,
}: {
  automations: AutomationRow[]
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const words = query.trim().toLowerCase()
  const items = automations.filter((item) =>
    [item.name, item.summary].some((text) => text.toLowerCase().includes(words))
  )
  return (
    <Page
      heading="h2"
      title="Automations"
      actions={
        <>
          <SearchInput
            label="Search automations"
            className="w-56"
            value={query}
            onChange={setQuery}
          />
          <Link href="/login" className={buttonVariants()}>
            <Plus />
            New automation
          </Link>
        </>
      }
    >
      {items.length > 0 ? (
        <AutomationTable rows={items} busy={false} onToggle={onToggle} />
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No matches
        </p>
      )}
    </Page>
  )
}

function CalendarPage({
  set,
  accounts,
  now,
}: {
  set: DemoSet
  accounts: Account[]
  now: number
}) {
  // Months from this one.
  const [offset, setOffset] = useState(0)
  const today = new Date(now)
  const month = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  return (
    <Page
      heading="h2"
      title="Calendar"
      actions={
        <>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setOffset(offset - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setOffset(offset + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <Link href="/login" className={buttonVariants()}>
            <Plus />
            New post
          </Link>
        </>
      }
    >
      <div className="-mt-4 flex items-center gap-3">
        <h3 className="text-base font-semibold" aria-live="polite">
          {monthName.format(month)}
        </h3>
      </div>
      <MonthGrid
        month={month}
        posts={calendarOf(set, month, now)}
        accounts={accounts}
        ready
      />
    </Page>
  )
}

function AnalyticsPage({
  set,
  accounts,
  now,
  days,
  onPeriod,
}: {
  set: DemoSet
  accounts: Account[]
  now: number
  days: InsightPeriod
  onPeriod: (days: InsightPeriod) => void
}) {
  // "all", or the id of the channel shown.
  const [tab, setTab] = useState("all")
  const [sort, setSort] = useState<InsightQuery["sort"]>("views")
  const [page, setPage] = useState(1)
  const [postId, setPostId] = useState<string | null>(null)
  const account = accounts.find((item) => item.id === tab)
  const report = account ? reportOf(set, account, days, sort, page, now) : null
  const post = report?.posts.find((item) => item.id === postId)
  return (
    <Page heading="h2" title="Analytics">
      <ChannelTabs
        accounts={accounts}
        selected={account?.id ?? null}
        onSelect={(id) => {
          setTab(id)
          setSort("views")
          setPage(1)
        }}
        days={days}
        onPeriod={(days) => {
          onPeriod(days)
          setPage(1)
        }}
      />
      {account && report ? (
        <>
          {report.platform === "instagram" ? (
            <InstagramSummary report={report} />
          ) : (
            <ChannelSummary report={report} />
          )}
          <ContentPerformance
            loading={false}
            error={null}
            retry={() => setPage(page)}
            report={report}
            sort={sort}
            onSort={(sort) => {
              setSort(sort)
              setPage(1)
            }}
            onPage={setPage}
            onOpen={setPostId}
          />
          <ReportNote report={report} />
          <PostDialog
            open={Boolean(post)}
            onClose={() => setPostId(null)}
            platform={account.platform}
            detail={post ? postReportOf(post) : null}
            className={THEME}
          />
        </>
      ) : (
        <section
          aria-label="All channels"
          className="grid grid-cols-[minmax(0,1fr)] gap-6"
        >
          <ChannelOverview
            overview={overviewOf(set, days, now)}
            days={days}
            accounts={accounts}
          />
        </section>
      )}
    </Page>
  )
}

function InboxPage({ set, now }: { set: DemoSet; now: number }) {
  const [threads, setThreads] = useState(() => inboxOf(set, now))
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState("")
  const words = query.trim().toLowerCase()
  const shown = threads.filter((item) =>
    (item.conversation.participant.name ?? "").toLowerCase().includes(words)
  )
  const open = threads.find((item) => item.conversation.id === selected)
  function choose(id: string) {
    setSelected(id)
    setDraft("")
    setThreads(
      threads.map((item) =>
        item.conversation.id === id
          ? { ...item, conversation: { ...item.conversation, unreadCount: 0 } }
          : item
      )
    )
  }
  function send() {
    const text = draft.trim()
    if (!open || !text) return
    const createdAt = new Date().toISOString()
    setThreads(
      threads.map((item) =>
        item === open
          ? {
              conversation: {
                ...item.conversation,
                lastMessage: text,
                updatedAt: createdAt,
              },
              messages: [
                ...item.messages,
                {
                  id: `${item.conversation.id}-${item.messages.length}`,
                  direction: "outgoing",
                  text,
                  attachments: [],
                  createdAt,
                },
              ],
            }
          : item
      )
    )
    setDraft("")
  }
  return (
    <div className="flex min-h-0 flex-1">
      {/* Narrow screens show the list or the open conversation. */}
      <Panel
        className={cn(
          "w-80 shrink-0 border-r max-md:w-full max-md:border-r-0",
          open && "max-md:hidden"
        )}
      >
        <PanelHeader heading="h2" title="Inbox" />
        <div className="px-4">
          <SearchInput
            label="Search conversations"
            value={query}
            onChange={setQuery}
          />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-0.5 overflow-auto p-3">
          {shown.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No matches
            </p>
          )}
          {shown.map((item) => (
            <ConversationButton
              key={item.conversation.id}
              conversation={item.conversation}
              selected={item === open}
              onOpen={() => choose(item.conversation.id)}
            />
          ))}
        </div>
      </Panel>
      <Panel className={cn("flex-1", !open && "max-md:hidden")}>
        {open ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="mx-4 mt-3 self-start md:hidden"
              onClick={() => setSelected(null)}
            >
              <ChevronLeft />
              Inbox
            </Button>
            <Thread
              conversation={open.conversation}
              messages={open.messages}
              loading={false}
              error={null}
              draft={draft}
              onDraft={setDraft}
              sending={false}
              onSend={send}
            />
          </>
        ) : (
          <EmptyState icon={<InboxIcon />} title="Select a conversation" />
        )}
      </Panel>
    </div>
  )
}

/**
 * The dashboard with sample data: the app's own pages and components, with
 * sets, pages, periods, switches and replies working locally.
 */
export function DemoApp() {
  const [now] = useState(() => Date.now())
  const [setId, setSetId] = useState(DEMO_SETS[0]!.id)
  const [page, setPage] = useState(PAGES[0]!.href)
  const [days, setDays] = useState<InsightPeriod>(30)
  const [statuses, setStatuses] = useState<Record<string, AutomationStatus>>({})
  const set = DEMO_SETS.find((item) => item.id === setId)!
  const accounts = accountsOf(set)
  const automations = set.automations.map((item) => ({
    ...item,
    status: statuses[item.id] ?? item.status,
  }))
  function toggle(id: string) {
    const item = automations.find((automation) => automation.id === id)!
    setStatuses({
      ...statuses,
      [id]: item.status === "active" ? "paused" : "active",
    })
  }

  return (
    <div
      role="region"
      aria-label="Sample aghost dashboard"
      className={cn(
        THEME,
        "flex h-[42.5rem] flex-col overflow-hidden border border-ink/10 bg-background shadow-[0_30px_80px_-40px_rgb(22_37_43/0.45)] md:h-[48.5rem]"
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-3 border-b bg-sidebar px-4">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto rounded-md bg-background px-3 py-0.5 text-xs text-muted-foreground">
          aghost.app{page}
        </span>
        <span className="text-xs text-muted-foreground">Sample data</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar px-2 pt-10 pb-2 md:flex">
          <Sidebar set={set} page={page} onSet={setSetId} onPage={setPage} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNavigation
            set={set}
            page={page}
            onSet={setSetId}
            onPage={setPage}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {page === "/home" && (
              <HomePage
                set={set}
                accounts={accounts}
                automations={automations}
                now={now}
                days={days}
                onPeriod={setDays}
                onToggle={toggle}
                onPage={setPage}
              />
            )}
            {page === "/automations" && (
              <AutomationsPage automations={automations} onToggle={toggle} />
            )}
            {page === "/calendar" && (
              <CalendarPage
                key={set.id}
                set={set}
                accounts={accounts}
                now={now}
              />
            )}
            {page === "/analytics" && (
              <AnalyticsPage
                key={set.id}
                set={set}
                accounts={accounts}
                now={now}
                days={days}
                onPeriod={setDays}
              />
            )}
            {page === "/inbox" && (
              <InboxPage key={set.id} set={set} now={now} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
