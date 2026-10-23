import { describe, expect, it, vi } from "vitest"
import { AutomationService } from "../modules/automations/automation.service"
import type { AutomationRepository } from "../modules/automations/automation.repository"
import type { AutomationProvider } from "../modules/automations/automation.provider"
import { recordingAnalytics } from "./analytics-fixture"

describe("automation creation compensation", () => {
  it("removes a provider automation if its database record cannot be saved", async () => {
    const failure = new Error("Database unavailable")
    const insert = vi
      .fn<AutomationRepository["insert"]>()
      .mockRejectedValue(failure)
    const repository: AutomationRepository = {
      insert,
      listByWorkspace: async () => [],
      listByAccount: async () => [],
      listByScheduledPost: async () => [],
      findById: async () => null,
      updateConfig: async () => {
        throw new Error("Unexpected update")
      },
      updateStatus: async () => {
        throw new Error("Unexpected update")
      },
      delete: async () => {},
    }
    const remove = vi
      .fn<AutomationProvider["delete"]>()
      .mockResolvedValue(undefined)
    const provider: AutomationProvider = {
      create: async () => "remote-new",
      update: async () => {},
      setStatus: async () => {},
      delete: remove,
      listStats: async () => new Map(),
      listActivity: async () => ({ entries: [], total: 0, hasMore: false }),
    }
    const recorded = recordingAnalytics()
    const service = new AutomationService(
      repository,
      provider,
      {
        findById: async () => ({
          id: "account",
          workspaceId: "workspace",
          providerAccountId: "remote-account",
          platform: "instagram",
          username: "creator",
          displayName: null,
          profilePictureUrl: null,
          status: "connected",
          disconnectReason: null,
          createdAt: "2026-10-09T10:00:00Z",
        }),
      },
      { listRecentPosts: async () => [] },
      { findById: async () => null },
      {
        assertCanRunAutomations: async () => {},
        assertCanUseAutomationFeatures: async () => {},
      },
      { run: (_workspaceId, work) => work() },
      recorded.source("dashboard")
    )
    await expect(
      service.create(
        {
          id: "workspace",
          ownerId: "owner",
          name: "Workspace",
          providerProfileId: "remote-profile",
        },
        {
          instagramAccountId: "account",
          name: "Guide",
          status: "active",
          trigger: { postScope: "any_post" },
          keywords: [],
          matchMode: "word",
          openingDm: null,
          dmMessage: "Guide",
          dmButtons: [],
          commentReply: null,
          requireFollow: false,
        }
      )
    ).rejects.toBe(failure)
    expect(insert).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledExactlyOnceWith("remote-new")
    // Nothing was created, so nothing is reported as created.
    expect(recorded.events).toEqual([])
  })
})
