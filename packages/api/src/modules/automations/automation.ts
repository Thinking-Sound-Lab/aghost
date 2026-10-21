import type {
  AutomationStatus,
  AutomationTrigger,
  DmButton,
  MatchMode,
  OpeningDm,
  ProductCard,
  FollowUp,
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
  notFollowingMessage: string | null
  productCarousel: ProductCard[] | null
  followUp: FollowUp | null
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
  | "notFollowingMessage"
  | "productCarousel"
  | "followUp"
>

export type NewAutomation = AutomationConfig &
  Pick<
    AutomationRecord,
    "workspaceId" | "accountId" | "providerAutomationId" | "status"
  >
