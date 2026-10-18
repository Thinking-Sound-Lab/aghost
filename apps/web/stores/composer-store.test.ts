import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  Automation,
  InstagramAccount,
  PostMedia,
  ScheduledPost,
} from "@workspace/api/contract"
import { api } from "@/lib/api"
import { localInput, useComposerStore } from "./composer-store"
import { useWorkspaceStore } from "./workspace-store"
import { useCalendarStore } from "./calendar-store"

vi.mock("@/lib/api", () => ({
  api: {
    accounts: { publishing: vi.fn() },
    scheduledPosts: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    automations: { get: vi.fn(), create: vi.fn(), stats: vi.fn() },
    media: { upload: vi.fn() },
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
const media: PostMedia = {
  url: "https://media.example/cover.jpg",
  type: "image",
}

function post(automationIds: string[] = []): ScheduledPost {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    instagramAccountId: account.id,
    kind: "post",
    caption: "Original caption",
    media: [media],
    trialReel: null,
    scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
    status: "scheduled",
    platformPostId: null,
    permalink: null,
    publishedAt: null,
    error: null,
    automationIds,
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
  }
}

function automationFor(saved: ScheduledPost): Automation {
  return {
    id: saved.automationIds[0]!,
    instagramAccountId: account.id,
    name: "Guide",
    status: "active",
    trigger: {
      postScope: "scheduled_post",
      scheduledPost: { id: saved.id, caption: saved.caption },
    },
    keywords: [],
    matchMode: "word",
    openingDm: null,
    dmMessage: "Guide",
    dmButtons: [],
    commentReply: null,
    requireFollow: false,
    productCarousel: null,
    followUp: null,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

async function draft(withAutomation = false) {
  await useComposerStore.getState().initialize(null, null)
  useComposerStore.getState().patch({
    caption: "Comment LINK",
    media: [media],
    scheduledAt: localInput(new Date(Date.now() + 86_400_000)),
  })
  useComposerStore.setState({
    automationOn: withAutomation,
    response: {
      dmFormat: "text",
      openingDm: null,
      dmMessage: "Here is the guide",
      dmButtons: [],
      commentReply: null,
      requireFollow: false,
    },
  })
}

describe("the scheduling composer across failures and navigation", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useComposerStore.setState(useComposerStore.getInitialState(), true)
    useCalendarStore.setState(useCalendarStore.getInitialState(), true)
    useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true)
    useWorkspaceStore.setState({
      workspace: { id: "workspace", name: "Workspace" },
      accounts: [account],
    })
    vi.mocked(api.accounts.publishing).mockResolvedValue({ canPublish: true })
    vi.mocked(api.automations.stats).mockResolvedValue({})
  })

  it.each(["manual", "automatic"] as const)(
    "schedules a %s Trial Reel with its comment-to-DM automation",
    async (graduationStrategy) => {
      await draft(true)
      const trialReel = { graduationStrategy }
      const video: PostMedia = {
        url: "https://media.example/trial.mp4",
        type: "video",
      }
      useComposerStore.getState().patch({ media: [video], trialReel })
      const saved = {
        ...post(["33333333-3333-4333-8333-333333333333"]),
        media: [video],
        trialReel,
      }
      vi.mocked(api.scheduledPosts.create).mockResolvedValue(saved)
      vi.mocked(api.automations.get).mockResolvedValue(automationFor(saved))
      expect(await useComposerStore.getState().save()).toEqual(saved)
      expect(api.scheduledPosts.create).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          kind: "post",
          media: [video],
          trialReel,
          automation: expect.objectContaining({
            dmMessage: "Here is the guide",
            status: "active",
          }),
        })
      )
    }
  )

  it("restores a saved trial in the composer and sends explicit null when the owner turns it off", async () => {
    const saved: ScheduledPost = {
      ...post(),
      media: [{ url: "https://media.example/trial.mp4", type: "video" }],
      trialReel: { graduationStrategy: "automatic" },
    }
    vi.mocked(api.scheduledPosts.get).mockResolvedValue(saved)
    await useComposerStore.getState().initialize(saved.id, null)
    expect(useComposerStore.getState().draft.trialReel).toEqual(saved.trialReel)
    useComposerStore.getState().patch({ caption: "Edited trial" })
    vi.mocked(api.scheduledPosts.update).mockResolvedValue({
      ...saved,
      caption: "Edited trial",
    })
    await useComposerStore.getState().save()
    expect(api.scheduledPosts.update).toHaveBeenLastCalledWith(
      saved.id,
      expect.objectContaining({ trialReel: saved.trialReel })
    )
    useComposerStore.getState().patch({ trialReel: null })
    vi.mocked(api.scheduledPosts.update).mockResolvedValue({
      ...saved,
      trialReel: null,
    })
    await useComposerStore.getState().save()
    expect(api.scheduledPosts.update).toHaveBeenLastCalledWith(
      saved.id,
      expect.objectContaining({ trialReel: null })
    )
  })

  it("highlights an incompatible Trial Reel before saving and clears trial mode for a story", async () => {
    await draft()
    useComposerStore
      .getState()
      .patch({ trialReel: { graduationStrategy: "manual" } })
    expect(await useComposerStore.getState().save()).toBeNull()
    expect(useComposerStore.getState().fields).toHaveProperty("trialReel")
    expect(api.scheduledPosts.create).not.toHaveBeenCalled()
    useComposerStore.getState().patch({ kind: "story" })
    expect(useComposerStore.getState().draft.trialReel).toBeNull()
  })

  it("includes the carousel and reminder in the scheduled post's automation", async () => {
    await draft(true)
    const productCarousel = [
      {
        title: "Creator kit",
        subtitle: "$29",
        imageUrl: "https://media.example/kit.jpg",
        buttonLabel: "Shop now",
        url: "https://example.com/kit",
      },
    ]
    const followUp = {
      message: "Still interested?",
      delayMinutes: 60,
      button: null,
    }
    useComposerStore.setState({
      response: {
        ...useComposerStore.getState().response,
        productCarousel,
        followUp,
        dmFormat: "carousel",
      },
    })
    const saved = post(["33333333-3333-4333-8333-333333333333"])
    vi.mocked(api.scheduledPosts.create).mockResolvedValue(saved)
    vi.mocked(api.automations.get).mockResolvedValue({
      ...automationFor(saved),
      productCarousel,
      followUp,
    })

    expect(await useComposerStore.getState().save()).toEqual(saved)
    expect(api.scheduledPosts.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        automation: expect.objectContaining({
          productCarousel,
          followUp,
          dmButtons: [],
        }),
      })
    )
  })

  it.each(["text", "carousel"] as const)(
    "keeps both format drafts but validates and sends only %s",
    async (dmFormat) => {
      await draft(true)
      const productCarousel = [
        {
          title: "Kit",
          subtitle: "$29",
          imageUrl: "https://media.example/kit.jpg",
          buttonLabel: "Shop",
          url: "https://example.com/kit",
        },
      ]
      const dmButtons = [{ label: "Guide", url: "https://example.com/guide" }]
      const response = {
        ...useComposerStore.getState().response,
        dmFormat,
        dmMessage: dmFormat === "carousel" ? "   " : "Your guide",
        productCarousel:
          dmFormat === "text"
            ? [{ ...productCarousel[0]!, imageUrl: "unfinished" }]
            : productCarousel,
        dmButtons:
          dmFormat === "carousel"
            ? [{ label: "", url: "unfinished" }]
            : dmButtons,
      }
      useComposerStore.setState({ response })
      const saved = post(["33333333-3333-4333-8333-333333333333"])
      vi.mocked(api.scheduledPosts.create).mockResolvedValue(saved)
      vi.mocked(api.automations.get).mockResolvedValue(automationFor(saved))
      expect(await useComposerStore.getState().save()).toEqual(saved)
      const sent = vi.mocked(api.scheduledPosts.create).mock.calls[0]![0]
        .automation!
      expect(sent).toMatchObject({
        dmMessage:
          dmFormat === "carousel" ? "Browse the collection." : "Your guide",
        productCarousel: dmFormat === "carousel" ? productCarousel : null,
        dmButtons: dmFormat === "text" ? dmButtons : [],
      })
      expect(sent).not.toHaveProperty("dmFormat")
      expect(useComposerStore.getState().response).toEqual(response)
    }
  )

  it("keeps a successful scheduling result when the optional automation refresh fails", async () => {
    await draft(true)
    const saved = post(["33333333-3333-4333-8333-333333333333"])
    vi.mocked(api.scheduledPosts.create).mockResolvedValue(saved)
    vi.mocked(api.automations.get).mockRejectedValue(
      new Error("Refresh failed")
    )
    expect(await useComposerStore.getState().save()).toEqual(saved)
    expect(api.automations.get).toHaveBeenCalledExactlyOnceWith(
      saved.automationIds[0]
    )
    expect(useComposerStore.getState()).toMatchObject({
      id: saved.id,
      post: saved,
      error: null,
    })
    vi.mocked(api.scheduledPosts.update).mockResolvedValue(saved)
    await useComposerStore.getState().save()
    expect(api.scheduledPosts.create).toHaveBeenCalledOnce()
    expect(api.scheduledPosts.update).toHaveBeenCalledExactlyOnceWith(
      saved.id,
      expect.objectContaining({ automation: null })
    )
    vi.mocked(api.scheduledPosts.remove).mockResolvedValue()
    expect(await useComposerStore.getState().remove()).toBe(true)
    expect(api.scheduledPosts.remove).toHaveBeenCalledExactlyOnceWith(saved.id)
  })

  it.each([true, false])(
    "refreshes the automation after leaving only for the same workspace (%s)",
    async (sameWorkspace) => {
      await draft(true)
      const saved = post(["33333333-3333-4333-8333-333333333333"])
      const refreshing = deferred<Automation>()
      vi.mocked(api.scheduledPosts.create).mockResolvedValue(saved)
      vi.mocked(api.automations.get).mockReturnValue(refreshing.promise)
      expect(await useComposerStore.getState().save()).toEqual(saved)
      useComposerStore.getState().leave()
      if (!sameWorkspace) useWorkspaceStore.getState().clear()
      const automation = automationFor(saved)
      refreshing.resolve(automation)
      await refreshing.promise
      expect(useWorkspaceStore.getState().automations).toEqual(
        sameWorkspace ? [automation] : []
      )
    }
  )

  it("discards uploads from a previous draft even when both drafts are new posts", async () => {
    await draft()
    const upload = deferred<PostMedia>()
    vi.mocked(api.media.upload).mockReturnValueOnce(upload.promise)
    const uploading = useComposerStore
      .getState()
      .addFiles([new File(["photo"], "old.jpg", { type: "image/jpeg" })])
    await useComposerStore.getState().initialize(null, null)
    useComposerStore.getState().patch({ caption: "Another post" })
    upload.resolve(media)
    await uploading
    expect(useComposerStore.getState()).toMatchObject({
      draft: { caption: "Another post", media: [] },
      uploads: [],
      error: null,
    })
  })

  it("preserves selection order and refuses a second batch until the first completes", async () => {
    await useComposerStore.getState().initialize(null, null)
    const video = deferred<PostMedia>()
    const clip: PostMedia = {
      type: "video",
      url: "https://media.example/clip.mp4",
    }
    vi.mocked(api.media.upload)
      .mockReturnValueOnce(video.promise)
      .mockResolvedValueOnce(media)
    const uploading = useComposerStore
      .getState()
      .addFiles([
        new File(["video"], "clip.mp4", { type: "video/mp4" }),
        new File(["photo"], "cover.jpg", { type: "image/jpeg" }),
      ])
    await useComposerStore
      .getState()
      .addFiles([new File(["other"], "other.jpg", { type: "image/jpeg" })])
    expect(api.media.upload).toHaveBeenCalledTimes(2)
    video.resolve(clip)
    await uploading
    expect(useComposerStore.getState().draft.media).toEqual([clip, media])
  })

  it("sends an existing post and its new automation through one update request", async () => {
    const original = post()
    vi.mocked(api.scheduledPosts.get).mockResolvedValue(original)
    await useComposerStore.getState().initialize(original.id, null)
    useComposerStore.setState({
      automationOn: true,
      response: {
        dmFormat: "text",
        openingDm: null,
        dmMessage: "Guide",
        dmButtons: [],
        commentReply: null,
        requireFollow: false,
      },
    })
    useComposerStore.getState().patch({ caption: "Comment LINK" })
    vi.mocked(api.scheduledPosts.update).mockRejectedValueOnce(
      new Error("Automation refused")
    )
    expect(await useComposerStore.getState().save()).toBeNull()
    expect(api.scheduledPosts.update).toHaveBeenCalledExactlyOnceWith(
      original.id,
      expect.objectContaining({
        caption: "Comment LINK",
        automation: expect.objectContaining({ dmMessage: "Guide" }),
      })
    )
    expect(api.automations.create).not.toHaveBeenCalled()
    expect(useComposerStore.getState().post).toEqual(original)
    expect(useCalendarStore.getState().posts).toEqual([])
  })

  it("reloads the calendar for a save that completes after leaving, so an older copy cannot replace a newer one", async () => {
    await draft()
    const saving = deferred<ScheduledPost>()
    vi.mocked(api.scheduledPosts.create).mockReturnValueOnce(saving.promise)
    const pending = useComposerStore.getState().save()
    useComposerStore.getState().leave()
    const newer = {
      ...post(),
      caption: "Saved again from another draft",
      updatedAt: "2026-10-14T01:00:00Z",
    }
    useCalendarStore.setState({ posts: [newer] })
    vi.mocked(api.scheduledPosts.list).mockResolvedValue([newer])
    saving.resolve(post())
    expect(await pending).toBeNull()
    expect(useComposerStore.getState()).toMatchObject({
      id: null,
      post: null,
      status: "idle",
      pending: null,
    })
    expect(api.scheduledPosts.list).toHaveBeenCalledOnce()
    await vi.waitFor(() =>
      expect(useCalendarStore.getState()).toMatchObject({
        posts: [newer],
        status: "ready",
      })
    )
  })

  it("removes a post deleted after the composer has been left from both lists", async () => {
    const saved = post(["33333333-3333-4333-8333-333333333333"])
    const automation = automationFor(saved)
    useCalendarStore.setState({ posts: [saved] })
    useWorkspaceStore.setState({ automations: [automation] })
    vi.mocked(api.scheduledPosts.get).mockResolvedValue(saved)
    await useComposerStore.getState().initialize(saved.id, null)
    const removing = deferred<void>()
    vi.mocked(api.scheduledPosts.remove).mockReturnValueOnce(removing.promise)
    const pending = useComposerStore.getState().remove()
    useComposerStore.getState().leave()
    vi.mocked(api.scheduledPosts.list).mockResolvedValue([])
    removing.resolve()
    expect(await pending).toBe(false)
    expect(useWorkspaceStore.getState().automations).toEqual([])
    expect(api.scheduledPosts.list).toHaveBeenCalledOnce()
    await vi.waitFor(() =>
      expect(useCalendarStore.getState()).toMatchObject({
        posts: [],
        status: "ready",
      })
    )
  })

  it("drops an automation refresh that lands after its post was deleted", async () => {
    await draft(true)
    const saved = post(["33333333-3333-4333-8333-333333333333"])
    const refreshing = deferred<Automation>()
    vi.mocked(api.scheduledPosts.create).mockResolvedValue(saved)
    vi.mocked(api.automations.get).mockReturnValueOnce(refreshing.promise)
    expect(await useComposerStore.getState().save()).toEqual(saved)
    useComposerStore.getState().leave()
    vi.mocked(api.scheduledPosts.get).mockResolvedValue(saved)
    await useComposerStore.getState().initialize(saved.id, null)
    vi.mocked(api.scheduledPosts.remove).mockResolvedValue()
    expect(await useComposerStore.getState().remove()).toBe(true)
    refreshing.resolve(automationFor(saved))
    await refreshing.promise
    expect(useWorkspaceStore.getState().automations).toEqual([])
    expect(useCalendarStore.getState().posts).toEqual([])
  })
})
