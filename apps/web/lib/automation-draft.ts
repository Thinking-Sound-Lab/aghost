import type { CreateAutomationInput } from "@workspace/api/contract"

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
