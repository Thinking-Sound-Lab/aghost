import { create } from "zustand"
import { ApiClientError } from "@workspace/api/client"
import {
  POST_LIMITS,
  type PostMedia,
  type UploadLink,
} from "@workspace/api/contract"
import { api } from "@/lib/api"
import { fileProblem, uploadFiles } from "@/lib/media"
import { useAuthStore } from "./auth-store"

/** A file on its way to storage. */
type Upload = { key: string; name: string }

type UploadLinkState = {
  link: UploadLink | null
  status: "idle" | "loading" | "ready" | "error"
  /** The link is not in this workspace, or does not exist. */
  missing: boolean
  /** Uploaded files, in the order they will be sent. */
  media: PostMedia[]
  uploads: Upload[]
  sending: boolean
  error: string | null
  load: (id: string) => Promise<void>
  addFiles: (files: File[]) => Promise<void>
  removeMedia: (index: number) => void
  /** Hands the uploaded files to the agent that asked for them. */
  send: () => Promise<void>
  /** Forgets the link, so the page loads it afresh when it opens again. */
  reset: () => void
}

function message(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "unauthenticated")
    useAuthStore.getState().expire()
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Try again."
}

const initial = {
  link: null,
  status: "idle" as const,
  missing: false,
  media: [],
  uploads: [],
  sending: false,
  error: null,
}

export const useUploadLinkStore = create<UploadLinkState>((set, get) => {
  // Changes whenever a link is opened or left; late answers are ignored.
  let version = 0
  return {
    ...initial,
    reset: () => {
      version++
      set(initial)
    },
    load: async (id) => {
      const loading = ++version
      set({ ...initial, status: "loading" })
      try {
        const link = await api.uploadLinks.get(id)
        if (version !== loading) return
        set({ link, media: link.media, status: "ready" })
      } catch (error) {
        if (version !== loading) return
        const missing =
          error instanceof ApiClientError && error.code === "not_found"
        set({
          status: "error",
          missing,
          error: missing ? null : message(error),
        })
      }
    },
    addFiles: async (files) => {
      const { link, media, uploads, sending } = get()
      if (link?.status !== "waiting") return
      // A batch keeps selection order; the next batch waits for it.
      if (uploads.length > 0 || sending) {
        set({ error: "Wait for the current uploads to finish." })
        return
      }
      if (media.length + files.length > POST_LIMITS.maxMediaItems) {
        set({
          error: `A post can have up to ${POST_LIMITS.maxMediaItems} photos or videos.`,
        })
        return
      }
      const problem = fileProblem(files)
      if (problem) {
        set({ error: problem })
        return
      }
      const current = version
      set({
        uploads: files.map((file) => ({
          key: crypto.randomUUID(),
          name: file.name,
        })),
        error: null,
      })
      const { media: added, failed } = await uploadFiles(files)
      if (version !== current) return
      set({
        uploads: [],
        media: [...get().media, ...added],
        ...(failed && { error: message(failed.reason) }),
      })
    },
    removeMedia: (index) =>
      set({ media: get().media.filter((_, i) => i !== index), error: null }),
    send: async () => {
      const { link, media, uploads, sending } = get()
      if (!link || sending || uploads.length > 0 || media.length === 0) return
      const current = version
      set({ sending: true, error: null })
      try {
        const sent = await api.uploadLinks.complete(link.id, { media })
        if (version !== current) return
        set({ link: sent, media: sent.media, sending: false })
      } catch (error) {
        if (version !== current) return
        // The link expired, or took files in another tab: show what it holds.
        if (error instanceof ApiClientError && error.code === "conflict")
          await get().load(link.id)
        else set({ sending: false, error: message(error) })
      }
    },
  }
})
