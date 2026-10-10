import type {
  AutomationStatus,
  AutomationTrigger,
  DmButton,
  MatchMode,
  OpeningDm,
} from "../../contract/automation"

export type AutomationRecord = {
  id: string
  workspaceId: string
  accountId: string
  providerAutomationId: string
  name: string
  status: AutomationStatus
  trigger: AutomationTrigger
  keywords: string[]
  matchMode: MatchMode
  openingDm: OpeningDm | null
  dmMessage: string
  dmButtons: DmButton[]
  commentReply: string | null
  requireFollow: boolean
  createdAt: string
  updatedAt: string
}

/** What an automation does: its trigger and its response. */
export type AutomationConfig = Pick<
  AutomationRecord,
  | "name"
  | "trigger"
  | "keywords"
  | "matchMode"
  | "openingDm"
  | "dmMessage"
  | "dmButtons"
  | "commentReply"
  | "requireFollow"
>

export type NewAutomation = AutomationConfig &
  Pick<
    AutomationRecord,
    "workspaceId" | "accountId" | "providerAutomationId" | "status"
  >
