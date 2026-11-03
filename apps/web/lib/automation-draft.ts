import type { CreateAutomationInput, OpeningDm } from "@workspace/api/contract"

/** Sent to commenters who don't follow yet, with the follow-confirmation button. */
export const DEFAULT_NOT_FOLLOWING_MESSAGE =
  "Follow me first, then tap the button below and I'll send you the link."

/**
 * The button that confirms a follow: the opening DM's, or the sender's default
 * when there is none.
 */
export function confirmLabelOf(openingDm: OpeningDm | null): string {
  return openingDm ? openingDm.buttonLabel || "…" : "I'm following"
}

/** Both formats keep their unsaved content; only the selected one is sent. */
export type AutomationDraft = CreateAutomationInput & {
  dmFormat: "text" | "carousel"
}

export type MessageDraft = Pick<
  AutomationDraft,
  "dmFormat" | "dmMessage" | "dmButtons" | "productCarousel" | "followUp"
>

export function responseForSave<T extends MessageDraft>(draft: T) {
  const { dmFormat, ...response } = draft
  return {
    ...response,
    dmMessage:
      dmFormat === "carousel"
        ? response.dmMessage.trim() || "Browse the collection."
        : response.dmMessage,
    dmButtons: dmFormat === "carousel" ? [] : response.dmButtons,
    productCarousel:
      dmFormat === "carousel" ? (response.productCarousel ?? null) : null,
  }
}
