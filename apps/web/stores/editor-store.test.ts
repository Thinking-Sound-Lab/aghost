import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  InstagramAccount,
  InstagramPost,
  ScheduledPost,
} from "@workspace/api/contract"
import { POST_LIMITS } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useEditorStore } from "./editor-store"
import { useWorkspaceStore } from "./workspace-store"

vi.mock("@/lib/api", () => ({
  api: {
    accounts: { posts: vi.fn() },
    scheduledPosts: { list: vi.fn(), get: vi.fn() },
    automations: { get: vi.fn() },
  },
}))
vi.mock("@/lib/analytics", () => ({ analytics: null }))
vi.mock("./auth-store", () => ({
  useAuthStore: { getState: () => ({ expire: vi.fn() }) },
}))

const account: InstagramAccount = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "creator",
  displayName: null,
  profilePictureUrl: null,
  status: "connected",
  disconnectReason: null,
  createdAt: "2026-10-14T00:00:00Z",
}
const recent: InstagramPost = {
  platformPostId: "instagram-post",
  caption: "Published",
  permalink: null,
  thumbnailUrl: null,
  mediaType: "IMAGE",
  publishedAt: null,
  commentCount: 0,
  likeCount: 0,
}
function scheduled(days = 1, accountId = account.id): ScheduledPost {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    instagramAccountId: accountId,
    kind: "post",
    caption: "Scheduled",
    trialReel: null,
    media: [{ type: "image", url: "https://media.example/a.jpg" }],
    scheduledFor: new Date(Date.now() + days * 86_400_000).toISOString(),
    status: "scheduled",
    platformPostId: null,
    permalink: null,
    publishedAt: null,
    error: null,
    automationIds: [],
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
  }
}

describe("independent published and scheduled post pickers", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useEditorStore.setState(useEditorStore.getInitialState(), true)
    useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true)
    useWorkspaceStore.setState({ accounts: [account] })
    vi.mocked(api.accounts.posts).mockResolvedValue([recent])
    vi.mocked(api.scheduledPosts.list).mockResolvedValue([])
  })

  it("keeps scheduled posts available when Instagram's recent-post request fails", async () => {
    const upcoming = scheduled()
    vi.mocked(api.accounts.posts).mockRejectedValue(
      new Error("Instagram rate limit")
    )
    vi.mocked(api.scheduledPosts.list).mockResolvedValue([upcoming])
    await useEditorStore.getState().initialize()
    expect(useEditorStore.getState()).toMatchObject({
      scheduledPosts: [upcoming],
      scheduledPostsError: null,
      postsError: "Instagram rate limit",
    })
    vi.mocked(api.accounts.posts).mockResolvedValue([recent])
    await useEditorStore.getState().loadPosts()
    expect(useEditorStore.getState().scheduledPosts).toEqual([upcoming])
    expect(api.scheduledPosts.list).toHaveBeenCalledOnce()
  })

  it("keeps published posts available when loading the scheduled period fails", async () => {
    vi.mocked(api.scheduledPosts.list).mockRejectedValue(
      new Error("Calendar unavailable")
    )
    await useEditorStore.getState().initialize()
    expect(useEditorStore.getState()).toMatchObject({
      posts: [recent],
      postsError: null,
      scheduledPostsError: "Calendar unavailable",
    })
  })

  it("browses posts beyond the first 92 days using adjacent bounded periods", async () => {
    const later = scheduled(120)
    vi.mocked(api.scheduledPosts.list).mockImplementation(async (range) =>
      range.from <= later.scheduledFor && range.to > later.scheduledFor
        ? [later]
        : []
    )
    await useEditorStore.getState().initialize()
    expect(useEditorStore.getState().scheduledPosts).toEqual([])
    const first = vi.mocked(api.scheduledPosts.list).mock.calls[0]![0]
    await useEditorStore.getState().loadScheduledPosts(1)
    const second = vi.mocked(api.scheduledPosts.list).mock.calls[1]![0]
    expect(second.from).toBe(first.to)
    expect(Date.parse(second.to) - Date.parse(second.from)).toBe(
      POST_LIMITS.maxRangeDays * 86_400_000
    )
    expect(useEditorStore.getState().scheduledPosts).toEqual([later])
    await useEditorStore.getState().loadScheduledPosts(-1)
    expect(vi.mocked(api.scheduledPosts.list).mock.calls[2]![0]).toEqual(first)
    expect(api.accounts.posts).toHaveBeenCalledOnce()
  })

  it("preserves the period's successful results when the selected-post read fails", async () => {
    const upcoming = scheduled()
    useEditorStore.getState().patch({
      trigger: {
        postScope: "scheduled_post",
        scheduledPostId: "missing-post",
      },
    })
    vi.mocked(api.scheduledPosts.list).mockResolvedValue([upcoming])
    vi.mocked(api.scheduledPosts.get).mockRejectedValue(
      new Error("Selected post was deleted")
    )
    await useEditorStore.getState().selectAccount(account.id)
    expect(useEditorStore.getState()).toMatchObject({
      scheduledPosts: [upcoming],
      scheduledPostsError: "Selected post was deleted",
      posts: [recent],
    })
  })
})
