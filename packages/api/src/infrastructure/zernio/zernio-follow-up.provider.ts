import type { CommentAutomationLog } from "@zernio/node"
import type { AutomationRecord } from "../../modules/automations/automation"
import type {
  FollowUpCheck,
  FollowUpJob,
  FollowUpProvider,
} from "../../modules/automations/follow-up.service"
import { ProviderError } from "../../shared/errors"
import { request, type ZernioAccess } from "./zernio-client"

export class ZernioFollowUpProvider implements FollowUpProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async check(
    job: FollowUpJob,
    automation: AutomationRecord,
    now: Date
  ): Promise<FollowUpCheck> {
    const fail = (reason: string, logId: string | null = null) => ({
      reason,
      logId,
    })
    const thread = await request("verify the reminder conversation", () =>
      this.zernio().messages.getInboxConversation({
        throwOnError: true,
        path: { conversationId: job.conversationId },
        query: { accountId: job.providerAccountId },
      })
    )
    if (
      thread.data?.accountId !== job.providerAccountId ||
      thread.data.participantId !== job.recipientId
    )
      return fail("unverified_conversation")
    const messages = await request(
      "check for a reply before the reminder",
      () =>
        this.zernio().messages.getInboxConversationMessages({
          throwOnError: true,
          path: { conversationId: job.conversationId },
          query: {
            accountId: job.providerAccountId,
            sortOrder: "desc",
            limit: 100,
          },
        })
    )
    if (!messages.messages)
      throw new ProviderError("The reminder conversation could not be read.")
    const sentAt = Date.parse(job.sourceSentAt)
    let latestInbound = 0
    for (const message of messages.messages) {
      const at = Date.parse(message.createdAt ?? "")
      if (message.direction === "incoming") {
        if (at > sentAt) return fail("replied")
        if (Number.isFinite(at)) latestInbound = Math.max(latestInbound, at)
      }
      // Let a person or a newer conversation take over instead of interrupting.
      if (message.direction === "outgoing" && at > sentAt)
        return fail("already_answered")
    }
    const log = await this.findLog(automation.providerAutomationId, job)
    if (!log?.id) return fail("unverified_delivery")
    if (log.clickedAt || (log.clickCount ?? 0) > 0)
      return fail("clicked", log.id)
    if (typeof log.clickCount !== "number" && log.clickedAt === undefined)
      return fail("unverified_clicks", log.id)
    const gateAt = Date.parse(log.gateResolvedAt ?? "")
    if (Number.isFinite(gateAt) && gateAt <= sentAt)
      latestInbound = Math.max(latestInbound, gateAt)
    if (!latestInbound || now.getTime() - latestInbound >= 24 * 60 * 60_000)
      return fail("outside_window", log.id)
    return { logId: log.id, reason: null }
  }

  private async findLog(
    automationId: string,
    job: FollowUpJob
  ): Promise<CommentAutomationLog | null> {
    for (let offset = 0; ; offset += 200) {
      const page = await request("verify the original DM and its clicks", () =>
        this.zernio().commentautomations.listCommentAutomationLogs({
          throwOnError: true,
          path: { automationId },
          query: { status: "sent", limit: 200, skip: offset },
        })
      )
      if (!page.logs || !page.pagination)
        throw new ProviderError("The original DM could not be verified.")
      const log = page.logs.find(
        (row) =>
          row.status === "sent" &&
          row.commenterId === job.recipientId &&
          Math.abs(
            Date.parse(row.gateResolvedAt ?? row.createdAt ?? "") -
              Date.parse(job.sourceSentAt)
          ) <= 60_000
      )
      if (log) return log
      if (!page.pagination.hasMore || page.logs.length === 0) return null
    }
  }

  async send(job: FollowUpJob, idempotencyKey: string): Promise<void> {
    await request("send the follow-up reminder", () =>
      this.zernio().messages.sendInboxMessage({
        throwOnError: true,
        path: { conversationId: job.conversationId },
        headers: { "Idempotency-Key": idempotencyKey },
        body: {
          accountId: job.providerAccountId,
          message: job.followUp.message,
          ...(job.followUp.button && {
            buttons: [
              {
                type: "url" as const,
                title: job.followUp.button.label,
                url: job.followUp.button.url,
              },
            ],
          }),
        },
      })
    )
  }
}
