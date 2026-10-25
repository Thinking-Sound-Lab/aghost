import { describe, expect, it, vi } from "vitest"
import type { ScheduledPostStatus } from "../contract/post"
import type { ScheduledPostRecord } from "../modules/posts/post"
import type { PublishingProvider } from "../modules/posts/post.provider"
import type { ScheduledPostRepository } from "../modules/posts/post.repository"
import { PostService } from "../modules/posts/post.service"
import type { WorkspaceOperations } from "../modules/workspaces/workspace-operations"
import { PlanRequiredError } from "../shared/errors"
import { recordingAnalytics } from "./analytics-fixture"

const workspace = {
  id: "workspace",
  ownerId: "owner",
  name: "Workspace",
  providerProfileId: "remote-profile",
}

function stored(
  id: string,
  status: ScheduledPostStatus,
  hoursAway: number
): ScheduledPostRecord {
  return {
    id,
    workspaceId: workspace.id,
    accountId: "account",
    platform: "instagram",
    providerPostId: `remote-${id}`,
    kind: "post",
    caption: null,
    media: [{ url: "https://media.example/a.jpg", type: "image" }],
    trialReel: null,
    youtube: null,
    scheduledFor: new Date(Date.now() + hoursAway * 3_600_000).toISOString(),
    status,
    platformPostId: null,
    permalink: null,
    error: null,
    publishedAt: null,
    automationIds: [],
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
  }
}

/** Posts kept in memory, and a provider that reports a post as published. */
function setup(
  posts: ScheduledPostRecord[],
  operations: WorkspaceOperations = { run: (_workspaceId, work) => work() }
) {
  const rows = new Map(posts.map((post) => [post.id, { ...post }]))
  const repository: ScheduledPostRepository = {
    listByRange: async () => [...rows.values()],
    listByAccount: async () => [...rows.values()],
    listScheduled: async () =>
      [...rows.values()].filter((post) => post.status === "scheduled"),
    findById: async (_workspaceId, id) => rows.get(id) ?? null,
    insert: async () => {
      throw new Error("Unexpected insert")
    },
    updateContent: async () => {
      throw new Error("Unexpected update")
    },
    updateState: async (_workspaceId, id, from, state) => {
      const row = rows.get(id)
      if (row?.status !== from) return false
      rows.set(id, { ...row, ...state })
      return true
    },
    delete: async (_workspaceId, id) => {
      rows.delete(id)
    },
  }
  const remove = vi.fn<PublishingProvider["delete"]>(async () => {})
  const provider: PublishingProvider = {
    canPublish: async () => true,
    createUpload: async () => {
      throw new Error("Unexpected upload")
    },
    schedule: async () => {
      throw new Error("Unexpected schedule")
    },
    reschedule: async () => {},
    getState: async () => ({
      status: "published",
      platformPostId: "ig-1",
      permalink: "https://instagram.com/p/1",
      error: null,
      publishedAt: "2026-10-14T09:00:00.000Z",
    }),
    delete: remove,
  }
  const deleteAutomations = vi.fn(async () => {})
  const plan = { assertCanUseWorkspace: vi.fn(async () => {}) }
  const recorded = recordingAnalytics()
  const service = new PostService(
    repository,
    provider,
    { findById: async () => null },
    {
      create: async () => {
        throw new Error("Unexpected automation")
      },
      deleteAllForScheduledPost: deleteAutomations,
    },
    plan,
    operations,
    recorded.source("webhook")
  )
  return { service, rows, remove, deleteAutomations, recorded, plan }
}

describe("scheduled posts outside the owner's requests", () => {
  it("refuses scheduling when the plan ends while the request waits for the workspace", async () => {
    let release!: () => void
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    const { service, rows, plan } = setup([], {
      run: async (_workspaceId, work) => {
        await waiting
        return work()
      },
    })
    const scheduling = service.schedule(workspace, {
      instagramAccountId: "account",
      kind: "post",
      caption: "",
      media: [{ url: "https://media.example/a.jpg", type: "image" }],
      scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
      automation: null,
      trialReel: null,
    })
    // The request passed the HTTP paywall, then waited behind billing.
    expect(plan.assertCanUseWorkspace).not.toHaveBeenCalled()
    plan.assertCanUseWorkspace.mockRejectedValue(
      new PlanRequiredError("schedule posts")
    )
    release()
    await expect(scheduling).rejects.toMatchObject({ code: "plan_required" })
    expect(rows.size).toBe(0)
  })

  it("preserves a post when an automation was attached while a restricted delete waited", async () => {
    let release!: () => void
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    const { service, rows, remove, deleteAutomations } = setup(
      [stored("waiting", "scheduled", 24)],
      {
        run: async (_workspaceId, work) => {
          await waiting
          return work()
        },
      }
    )
    const deleting = service.delete(workspace, "waiting", false)
    rows.get("waiting")!.automationIds = ["attached-automation"]
    release()
    await expect(deleting).rejects.toMatchObject({ code: "forbidden" })
    expect(remove).not.toHaveBeenCalled()
    expect(deleteAutomations).not.toHaveBeenCalled()
    expect(rows.size).toBe(1)
  })

  it("cancels the posts still waiting when the plan ends and keeps them as failed", async () => {
    const { service, rows, remove, recorded } = setup([
      stored("waiting", "scheduled", 24),
      // Its time has passed: it went out, so it is not cancelled.
      stored("due", "scheduled", -1),
      stored("done", "published", -48),
    ])
    await service.cancelAll(workspace)
    expect(remove).toHaveBeenCalledExactlyOnceWith("remote-waiting")
    expect(rows.get("waiting")).toMatchObject({
      status: "failed",
      error: "Not published: the plan ended before this post's time.",
    })
    expect(rows.get("due")?.status).toBe("published")
    expect(rows.get("done")?.status).toBe("published")
    expect(recorded.events.map(({ event }) => event)).toEqual([
      { name: "scheduled_post_failed", post_id: "waiting", reason: "plan" },
      { name: "scheduled_post_published", post_id: "due" },
    ])
    // Nothing is left to cancel the second time.
    await service.cancelAll(workspace)
    expect(remove).toHaveBeenCalledOnce()
  })

  it("removing an account cancels waiting posts but leaves ones that went out on Instagram", async () => {
    const { service, rows, remove, deleteAutomations } = setup([
      stored("waiting", "scheduled", 24),
      stored("unseen", "scheduled", -1),
    ])
    await service.deleteAllForAccount(workspace, "account")
    expect(remove).toHaveBeenCalledExactlyOnceWith("remote-waiting")
    expect(deleteAutomations).toHaveBeenCalledExactlyOnceWith(
      workspace,
      "waiting"
    )
    expect(rows.size).toBe(0)
  })
})

describe("cross-posting when a copy fails", () => {
  it("cancels every scheduled copy, even after one cancellation fails", async () => {
    const accounts = ["twitter", "threads", "linkedin"].map((platform) => ({
      id: `account-${platform}`,
      workspaceId: workspace.id,
      providerAccountId: `remote-${platform}`,
      platform: platform as "twitter" | "threads" | "linkedin",
      username: "studio",
      displayName: "Studio",
      profilePictureUrl: null,
      status: "connected" as const,
      disconnectReason: null,
      createdAt: "2026-10-14T00:00:00Z",
    }))
    const rows = new Map<string, ScheduledPostRecord>()
    const repository: ScheduledPostRepository = {
      listByRange: async () => [...rows.values()],
      listByAccount: async () => [...rows.values()],
      listScheduled: async () => [...rows.values()],
      findById: async (_workspaceId, id) => rows.get(id) ?? null,
      insert: async (input) => {
        const post = {
          ...stored(`post-${rows.size + 1}`, "scheduled", 24),
          ...input,
        }
        rows.set(post.id, post)
        return post
      },
      updateContent: async () => {
        throw new Error("Unexpected update")
      },
      updateState: async () => false,
      delete: async (_workspaceId, id) => {
        rows.delete(id)
      },
    }
    let scheduled = 0
    const remove = vi.fn<PublishingProvider["delete"]>(async (id) => {
      if (id === "remote-1") throw new Error("Provider unavailable")
    })
    const provider: PublishingProvider = {
      canPublish: async () => true,
      createUpload: async () => {
        throw new Error("Unexpected upload")
      },
      schedule: async () => {
        scheduled += 1
        if (scheduled === 3) throw new Error("LinkedIn refused the post")
        return `remote-${scheduled}`
      },
      reschedule: async () => {},
      getState: async () => {
        throw new Error("Unexpected state read")
      },
      delete: remove,
    }
    const service = new PostService(
      repository,
      provider,
      {
        findById: async (_workspaceId, id) =>
          accounts.find((account) => account.id === id) ?? null,
      },
      {
        create: async () => {
          throw new Error("Unexpected automation")
        },
        deleteAllForScheduledPost: async () => {},
      },
      { assertCanUseWorkspace: async () => {} },
      { run: (_workspaceId, work) => work() },
      recordingAnalytics().source("webhook")
    )

    await expect(
      service.crossPost(workspace, {
        kind: "post",
        caption: "Launch day",
        media: [],
        trialReel: null,
        scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
        automation: null,
        targets: accounts.map((account) => ({
          accountId: account.id,
          caption: null,
          youtube: null,
        })),
      })
    ).rejects.toMatchObject({
      code: "provider_error",
      message: expect.stringContaining("1 copy already scheduled"),
    })
    expect(remove.mock.calls.map(([id]) => id)).toEqual([
      "remote-1",
      "remote-2",
    ])
    // The copy that couldn't be cancelled stays visible; the other is gone.
    expect([...rows.values()].map((post) => post.providerPostId)).toEqual([
      "remote-1",
    ])
  })
})
