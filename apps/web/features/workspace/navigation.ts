import {
  CalendarDays,
  ChartNoAxesCombined,
  House,
  Inbox,
  Settings,
  Workflow,
} from "lucide-react"

/** A sidebar row; NAV_ITEM_ACTIVE marks the page being shown. */
export const NAV_ITEM =
  "flex h-11 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
export const NAV_ITEM_ACTIVE =
  "bg-card font-medium text-foreground hover:bg-card"

export const navigation = [
  { href: "/home", label: "Home", icon: House },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
]
