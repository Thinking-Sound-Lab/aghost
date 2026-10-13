import { randomUUID } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import {
  createAutomationSchema,
  followUpSchema,
  productCarouselSchema,
} from "../contract/automation"
import { PLANS } from "../contract/billing"
import { PlanEntitlements } from "../modules/billing/plan-entitlements"
import type { BillingRepository } from "../modules/billing/billing.repository"
import type { AutomationRecord } from "../modules/automations/automation"
import { ZernioWebhookGateway } from "../infrastructure/zernio/zernio-webhook.gateway"
import {
  FollowUpService,
  type FollowUpJob,
  type FollowUpRepository,
  type FollowUpProvider,
} from "../modules/automations/follow-up.service"

export const productCard = {
  title: "Creator kit",
  subtitle: "$29 · everything for your launch",
  imageUrl: "https://example.com/kit.jpg",
  buttonLabel: "Shop now",
  url: "https://example.com/kit",
}
const followUp = {
  message: "Still interested?",
  delayMinutes: 30,
  button: { label: "View kit", url: "https://example.com/kit" },
}
const now = new Date("2026-10-13T12:00:00.000Z")
const automation: AutomationRecord = {
  id: randomUUID(),
  workspaceId: randomUUID(),
  accountId: randomUUID(),
  providerAutomationId: "provider-auto",
  name: "Creator kit",
  status: "active",
  trigger: { postScope: "any_post" },
  keywords: ["KIT"],
  matchMode: "word",
  openingDm: null,
  dmMessage: "Your kit",
  dmButtons: [],
  productCarousel: [productCard],
  followUp,
  commentReply: null,
  requireFollow: false,
  createdAt: "2026-10-13T10:00:00.000Z",
  updatedAt: "2026-10-13T10:00:00.000Z",
}

describe("carousel and reminder input", () => {
  it("starts the timer on a main automation DM, and ignores opening postback gates", () => {
    const gateway = new ZernioWebhookGateway("fixture")
    const payload = {
      id: "event",
      event: "message.sent",
      account: { id: "account", profileId: "profile", platform: "instagram" },
      conversation: { id: "thread", platformConversationId: "reader" },
      message: {
        id: "message",
        direction: "outgoing",
        sentAt: now.toISOString(),
        sentVia: "comment_automation",
        automationId: "automation",
      },
    }
    expect(gateway.parse(JSON.stringify(payload)).kind).toBe(
      "automation_dm_sent"
    )
    expect(
      gateway.parse(
        JSON.stringify({
          ...payload,
          metadata: {
            metaInteractive: {
              buttons: [{ type: "postback", payload: "gate" }],
            },
          },
        })
      ).kind
    ).toBe("unhandled")
    expect(gateway.parse(JSON.stringify({ ...payload, test: true })).kind).toBe(
      "unhandled"
    )
  })
  it("accepts 1–10 HTTPS product cards and rejects invalid formats", () => {
    expect(productCarouselSchema.parse([productCard])).toEqual([productCard])
    for (const cards of [
      [],
      Array(11).fill(productCard),
      [{ ...productCard, title: "x".repeat(81) }],
      [{ ...productCard, imageUrl: "javascript:alert(1)" }],
    ])
      expect(productCarouselSchema.safeParse(cards).success).toBe(false)
    expect(
      createAutomationSchema.safeParse({
        ...automation,
        instagramAccountId: automation.accountId,
        dmButtons: [{ label: "Shop", url: productCard.url }],
      }).success
    ).toBe(false)
  })
  it("enforces 30 minutes to 20 hours and validates the optional reminder link", () => {
    for (const delayMinutes of [30, 60, 1200])
      expect(
        followUpSchema.safeParse({ ...followUp, delayMinutes }).success
      ).toBe(true)
    for (const delayMinutes of [29, 1201, 30.5])
      expect(
        followUpSchema.safeParse({ ...followUp, delayMinutes }).success
      ).toBe(false)
    expect(
      followUpSchema.safeParse({
        ...followUp,
        button: { label: "View", url: "http://example.com" },
      }).success
    ).toBe(false)
    expect(
      followUpSchema.safeParse({ ...followUp, message: "x".repeat(641) })
        .success
    ).toBe(false)
  })
})

describe("shared plan feature policy", () => {
  const workspace = {
    id: automation.workspaceId,
    ownerId: "owner",
    name: "Studio",
    providerProfileId: "profile",
  }
  function plan(id: "pro" | "growth" | "business") {
    return new PlanEntitlements(
      {
        findByWorkspace: async () => ({
          subscription: { plan: id, status: "active" },
        }),
      } as unknown as BillingRepository,
      { countConnected: async () => 1 }
    )
  }
  it("reserves carousels for Growth and Business, and nudges for Business", async () => {
    await expect(
      plan("pro").assertCanUseAutomationFeatures(workspace, {
        ...automation,
        followUp: null,
      })
    ).rejects.toMatchObject({ code: "plan_limit_reached" })
    await expect(
      plan("growth").assertCanUseAutomationFeatures(workspace, {
        ...automation,
        followUp: null,
      })
    ).resolves.toBeUndefined()
    await expect(
      plan("growth").assertCanUseAutomationFeatures(workspace, automation)
    ).rejects.toMatchObject({ code: "plan_limit_reached" })
    await expect(
      plan("business").assertCanUseAutomationFeatures(workspace, automation)
    ).resolves.toBeUndefined()
  })
})

describe("durable follow-up delivery", () => {
  function setup() {
    const job: FollowUpJob = {
      id: "job-1",
      automationId: automation.id,
      workspaceId: automation.workspaceId,
      providerAccountId: "provider-account",
      recipientId: "reader",
      conversationId: "thread",
      sourceSentAt: "2026-10-13T11:00:00.000Z",
      automationUpdatedAt: automation.updatedAt,
      followUp,
      attempts: 1,
    }
    const context = {
      automation: { ...automation },
      account: {
        id: automation.accountId,
        workspaceId: automation.workspaceId,
        providerAccountId: job.providerAccountId,
        username: "studio",
        displayName: null,
        profilePictureUrl: null,
        status: "connected" as const,
        disconnectReason: null,
        createdAt: automation.createdAt,
      },
      plan: PLANS.business,
    }
    const jobs: FollowUpRepository = {
      claim: vi.fn(async () => [job]),
      load: vi.fn(async () => context),
      stillClaimed: vi.fn(async () => true),
      finish: vi.fn(async () => {}),
      retry: vi.fn(async () => {}),
    }
    const provider = {
      check: vi.fn(async () => ({
        logId: "original-log",
        reason: null as string | null,
      })),
      send: vi.fn<FollowUpProvider["send"]>().mockResolvedValue(undefined),
    }
    const worker = new FollowUpService(
      jobs,
      provider,
      { run: async (_id, work) => work() },
      () => now
    )
    return { job, jobs, provider, worker, context }
  }
  it("sends with a key tied to the original DM, and records delivery", async () => {
    const { worker, provider, job, jobs } = setup()
    await worker.run(() => {})
    expect(provider.send).toHaveBeenCalledExactlyOnceWith(
      job,
      `aghost-nudge-${automation.id}-original-log`
    )
    expect(jobs.finish).toHaveBeenCalledWith(
      job.id,
      expect.any(String),
      "sent",
      null,
      "original-log"
    )
  })
  it.each([
    "clicked",
    "replied",
    "outside_window",
    "already_answered",
    "unverified_delivery",
  ])("skips a reminder when the provider reports %s", async (reason) => {
    const { worker, provider, jobs } = setup()
    provider.check.mockResolvedValue({ logId: "original-log", reason })
    await worker.run(() => {})
    expect(provider.send).not.toHaveBeenCalled()
    expect(jobs.finish).toHaveBeenCalledWith(
      "job-1",
      expect.any(String),
      "cancelled",
      reason,
      "original-log"
    )
  })
  it("rechecks the plan and automation configuration under workspace ownership", async () => {
    const { worker, context, provider, jobs } = setup()
    context.plan = PLANS.growth
    await worker.run(() => {})
    expect(provider.check).not.toHaveBeenCalled()
    expect(jobs.finish).toHaveBeenCalledWith(
      "job-1",
      expect.any(String),
      "cancelled",
      "plan_changed",
      null
    )
    context.plan = PLANS.business
    context.automation.updatedAt = "2026-10-13T10:30:00Z"
    await worker.run(() => {})
    expect(provider.send).not.toHaveBeenCalled()
  })
  it("does not send if a reply cancels its claim during the provider check", async () => {
    const { worker, provider, jobs } = setup()
    vi.mocked(jobs.stillClaimed)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    await worker.run(() => {})
    expect(provider.send).not.toHaveBeenCalled()
  })
  it("leaves transport failures retryable with the same delivery key", async () => {
    const { worker, provider, jobs, job } = setup()
    provider.send.mockRejectedValueOnce(new Error("Network interrupted"))
    const onError = vi.fn()
    await worker.run(onError)
    expect(onError).toHaveBeenCalledOnce()
    expect(jobs.retry).toHaveBeenCalledWith(job, expect.any(String))
    await worker.run(onError)
    expect(provider.send.mock.calls.map((call) => call[1])).toEqual([
      `aghost-nudge-${automation.id}-original-log`,
      `aghost-nudge-${automation.id}-original-log`,
    ])
  })
})
