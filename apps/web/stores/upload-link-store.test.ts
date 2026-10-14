import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiClientError } from "@workspace/api/client"
import type { PostMedia, UploadLink } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useUploadLinkStore } from "./upload-link-store"

vi.mock("@/lib/api", () => ({
  api: {
    media: { upload: vi.fn() },
    uploadLinks: { get: vi.fn(), complete: vi.fn() },
  },
}))
vi.mock("./auth-store", () => ({
  useAuthStore: { getState: () => ({ expire: vi.fn() }) },
}))

const LINK_ID = "44444444-4444-4444-8444-444444444444"

function link(overrides: Partial<UploadLink> = {}): UploadLink {
  return {
    id: LINK_ID,
    url: `https://aghost.app/upload?link=${LINK_ID}`,
    status: "waiting",
    media: [],
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    uploadedAt: null,
    ...overrides,
  }
}

const photo: PostMedia = {
  url: "https://media.example/cover.jpg",
  type: "image",
}
const clip: PostMedia = { url: "https://media.example/clip.mp4", type: "video" }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

describe("the page where the owner uploads files for an agent", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useUploadLinkStore.getState().reset()
  })

  it("uploads the chosen files in order and sends them to the agent", async () => {
    vi.mocked(api.uploadLinks.get).mockResolvedValue(link())
    await useUploadLinkStore.getState().load(LINK_ID)
    // The cover finishes uploading last but stays first.
    const cover = deferred<PostMedia>()
    vi.mocked(api.media.upload)
      .mockReturnValueOnce(cover.promise)
      .mockResolvedValueOnce(clip)
    const adding = useUploadLinkStore
      .getState()
      .addFiles([
        new File(["photo"], "cover.jpg", { type: "image/jpeg" }),
        new File(["video"], "clip.mp4", { type: "video/mp4" }),
      ])
    expect(useUploadLinkStore.getState().uploads).toHaveLength(2)
    cover.resolve(photo)
    await adding
    expect(useUploadLinkStore.getState()).toMatchObject({
      media: [photo, clip],
      uploads: [],
    })

    const sent = link({
      status: "uploaded",
      media: [photo, clip],
      uploadedAt: new Date().toISOString(),
    })
    vi.mocked(api.uploadLinks.complete).mockResolvedValue(sent)
    await useUploadLinkStore.getState().send()
    expect(api.uploadLinks.complete).toHaveBeenCalledExactlyOnceWith(LINK_ID, {
      media: [photo, clip],
    })
    expect(useUploadLinkStore.getState()).toMatchObject({
      link: sent,
      sending: false,
      error: null,
    })
  })

  it("refuses files Instagram can't post and more than a carousel holds, before uploading", async () => {
    vi.mocked(api.uploadLinks.get).mockResolvedValue(link({ media: [] }))
    await useUploadLinkStore.getState().load(LINK_ID)
    await useUploadLinkStore
      .getState()
      .addFiles([new File(["gif"], "loop.gif", { type: "image/gif" })])
    expect(useUploadLinkStore.getState().error).toMatch(/^loop\.gif: /)
    await useUploadLinkStore
      .getState()
      .addFiles(
        Array.from(
          { length: 11 },
          (_, index) =>
            new File(["photo"], `${index}.jpg`, { type: "image/jpeg" })
        )
      )
    expect(useUploadLinkStore.getState().error).toBe(
      "A post can have up to 10 photos or videos."
    )
    expect(api.media.upload).not.toHaveBeenCalled()
  })

  it("keeps the uploads that finished and reports the one that failed", async () => {
    vi.mocked(api.uploadLinks.get).mockResolvedValue(link())
    await useUploadLinkStore.getState().load(LINK_ID)
    vi.mocked(api.media.upload)
      .mockResolvedValueOnce(photo)
      .mockRejectedValueOnce(
        new ApiClientError("provider_error", "Could not upload clip.mp4.")
      )
    await useUploadLinkStore
      .getState()
      .addFiles([
        new File(["photo"], "cover.jpg", { type: "image/jpeg" }),
        new File(["video"], "clip.mp4", { type: "video/mp4" }),
      ])
    expect(useUploadLinkStore.getState()).toMatchObject({
      media: [photo],
      uploads: [],
      error: "Could not upload clip.mp4.",
    })
  })

  it("explains a link from another workspace as not valid", async () => {
    vi.mocked(api.uploadLinks.get).mockRejectedValue(
      new ApiClientError("not_found", "Upload link was not found.")
    )
    await useUploadLinkStore.getState().load(LINK_ID)
    expect(useUploadLinkStore.getState()).toMatchObject({
      status: "error",
      missing: true,
      error: null,
    })
  })

  it("shows what the link holds when it expired or took files elsewhere before sending", async () => {
    vi.mocked(api.uploadLinks.get).mockResolvedValueOnce(
      link({ media: [photo] })
    )
    await useUploadLinkStore.getState().load(LINK_ID)
    vi.mocked(api.uploadLinks.complete).mockRejectedValue(
      new ApiClientError(
        "conflict",
        "This link has expired. Ask your agent for a new one."
      )
    )
    const expired = link({
      status: "expired",
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    })
    vi.mocked(api.uploadLinks.get).mockResolvedValueOnce(expired)
    await useUploadLinkStore.getState().send()
    expect(useUploadLinkStore.getState()).toMatchObject({
      link: expired,
      status: "ready",
      sending: false,
    })
  })

  it("ignores a link that loads after the page was left", async () => {
    const loading = deferred<UploadLink>()
    vi.mocked(api.uploadLinks.get).mockReturnValueOnce(loading.promise)
    const pending = useUploadLinkStore.getState().load(LINK_ID)
    useUploadLinkStore.getState().reset()
    loading.resolve(link())
    await pending
    expect(useUploadLinkStore.getState()).toMatchObject({
      link: null,
      status: "idle",
    })
  })
})
