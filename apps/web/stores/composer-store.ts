import { create } from "zustand"
import {
  AUTOMATION_LIMITS,
  POST_LIMITS,
  schedulePostSchema,
  updateScheduledPostSchema,
  type PostKind,
  type PostMedia,
  type ScheduledPost,
  type TrialReel,
} from "@workspace/api/contract"
import { ApiClientError } from "@workspace/api/client"
import {
  keywordsOf,
  type KeywordDraft,
  type ResponseDraft,
} from "@/features/automations/automation-fields"
import { timeLabel } from "@/features/calendar/post-media"
import { api } from "@/lib/api"
import { responseForSave } from "@/lib/automation-draft"
import { fileProblem, uploadFiles } from "@/lib/media"
import { useCalendarStore } from "./calendar-store"
import { errorMessage, useWorkspaceStore } from "./workspace-store"

type Draft = {
  instagramAccountId: string
  kind: PostKind
  caption: string
  media: PostMedia[]
  trialReel: TrialReel | null
  /** Local date and time, as a datetime-local input holds it. */
  scheduledAt: string
}

/** A file on its way to storage. */
type Upload = { key: string; name: string }

type ComposerState = {
  /** Changes whenever a draft is opened or left; late requests are ignored. */
  revision: number
  id: string | null
  /** The post as stored, when editing one. */
  post: ScheduledPost | null
  draft: Draft
  uploads: Upload[]
  /** Null while unknown. */
  canPublish: boolean | null
  /** Whether the post gets an automation that answers its comments. */
  automationOn: boolean
  response: ResponseDraft
  keywords: KeywordDraft
  preview: "post" | "dm"
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  fields: Record<string, string>
  /** The request in flight, which locks the draft until it answers. */
  pending: "save" | "remove" | null
  /** Posts deleted since the app opened; late results must not restore them. */
  removed: string[]
  initialize: (id: string | null, day: string | null) => Promise<void>
  leave: () => void
  patch: (patch: Partial<Draft>) => void
  selectAccount: (id: string) => Promise<void>
  addFiles: (files: File[]) => Promise<void>
  removeMedia: (index: number) => void
  /** Moves an item one place earlier; the first is the carousel's cover. */
  moveEarlier: (index: number) => void
  save: () => Promise<ScheduledPost | null>
  remove: () => Promise<boolean>
}

const pad = (value: number) => String(value).padStart(2, "0")

/** A date as a datetime-local input's value. */
export function localInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 10:00 on the chosen day, or the next full hour that leaves time to prepare
 * when that has passed.
 */
function suggestedTime(day: string | null): string {
  const earliest = Date.now() + 2 * POST_LIMITS.minLeadMinutes * 60_000
  const chosen = day ? new Date(`${day}T10:00`) : null
  if (chosen && chosen.getTime() >= earliest) return localInput(chosen)
  const next = new Date(earliest)
  next.setHours(next.getHours() + 1, 0, 0, 0)
  return localInput(next)
}

function emptyResponse(): ResponseDraft {
  return {
    openingDm: null,
    dmMessage: "",
    dmButtons: [{ label: "", url: "" }],
    commentReply: null,
    requireFollow: false,
    productCarousel: null,
    dmFormat: "text",
    followUp: null,
  }
}

/** The caption's first line, or when the post goes out. */
function automationName(draft: Draft, scheduledFor: string): string {
  const line = draft.caption.trim().split("\n")[0]!.trim()
  return (line || `Post on ${timeLabel(scheduledFor)}`).slice(
    0,
    AUTOMATION_LIMITS.nameMaxLength
  )
}

function fieldsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {}
  for (const issue of issues) fields[issue.path.join(".")] = issue.message
  return fields
}

/** Whether the workspace a request started in is still the one open. */
function inWorkspace(workspaceId: string | undefined): boolean {
  return (
    workspaceId !== undefined &&
    useWorkspaceStore.getState().workspace?.id === workspaceId
  )
}

export const useComposerStore = create<ComposerState>((set, get) => ({
  revision: 0,
  id: null,
  post: null,
  draft: {
    instagramAccountId: "",
    kind: "post",
    caption: "",
    media: [],
    trialReel: null,
    scheduledAt: "",
  },
  uploads: [],
  canPublish: null,
  automationOn: false,
  response: emptyResponse(),
  keywords: { keywordText: "", anyWord: false },
  preview: "post",
  status: "idle",
  error: null,
  fields: {},
  pending: null,
  removed: [],
  initialize: async (id, day) => {
    const revision = get().revision + 1
    set({
      revision,
      id,
      post: null,
      draft: {
        instagramAccountId: "",
        kind: "post",
        caption: "",
        media: [],
        trialReel: null,
        scheduledAt: suggestedTime(day),
      },
      uploads: [],
      canPublish: null,
      automationOn: false,
      response: emptyResponse(),
      keywords: { keywordText: "", anyWord: false },
      preview: "post",
      status: "loading",
      error: null,
      fields: {},
      pending: null,
    })
    try {
      if (id) {
        const post = await api.scheduledPosts.get(id)
        // The owner opened another post, or a new one, meanwhile.
        if (get().revision !== revision) return
        set({
          post,
          draft: {
            instagramAccountId: post.instagramAccountId,
            kind: post.kind,
            caption: post.caption ?? "",
            media: post.media,
            trialReel: post.trialReel ?? null,
            scheduledAt: localInput(new Date(post.scheduledFor)),
          },
          status: "ready",
        })
        if (post.status === "scheduled")
          await get().selectAccount(post.instagramAccountId)
        return
      }
      set({ status: "ready" })
      const account = useWorkspaceStore
        .getState()
        .accounts.find((item) => item.status === "connected")
      if (account) await get().selectAccount(account.id)
    } catch (error) {
      if (get().revision === revision)
        set({ status: "error", error: errorMessage(error) })
    }
  },
  leave: () =>
    set({
      revision: get().revision + 1,
      uploads: [],
      pending: null,
      status: "idle",
    }),
  patch: (patch) =>
    set({
      draft: {
        ...get().draft,
        ...patch,
        ...(patch.kind === "story" && { trialReel: null }),
      },
      fields: {},
      error: null,
    }),
  selectAccount: async (id) => {
    const revision = get().revision
    set({
      draft: { ...get().draft, instagramAccountId: id },
      canPublish: null,
      error: null,
    })
    try {
      const { canPublish } = await api.accounts.publishing(id)
      if (get().revision === revision && get().draft.instagramAccountId === id)
        set({ canPublish })
    } catch (error) {
      if (get().revision === revision && get().draft.instagramAccountId === id)
        set({ error: errorMessage(error) })
    }
  },
  addFiles: async (files) => {
    const { draft, uploads, revision, pending } = get()
    // A batch keeps selection order; the next batch waits for its slots.
    if (uploads.length > 0 || pending) {
      set({ error: "Wait for the current uploads or save to finish." })
      return
    }
    const room =
      (draft.kind === "story" || draft.trialReel
        ? 1
        : POST_LIMITS.maxMediaItems) -
      draft.media.length -
      uploads.length
    if (files.length > room) {
      set({
        error: draft.trialReel
          ? "A Trial Reel needs exactly one video."
          : draft.kind === "story"
            ? "A story has one photo or video."
            : `A post can have up to ${POST_LIMITS.maxMediaItems} photos or videos.`,
      })
      return
    }
    if (
      draft.trialReel &&
      files.some((file) => !file.type.startsWith("video/"))
    ) {
      set({ error: "A Trial Reel needs exactly one video." })
      return
    }
    const problem = fileProblem(files)
    if (problem) {
      set({ error: problem })
      return
    }
    const started = files.map((file) => ({
      key: crypto.randomUUID(),
      name: file.name,
    }))
    set({ uploads: [...get().uploads, ...started], error: null, fields: {} })
    const { media: added, failed } = await uploadFiles(files)
    if (get().revision !== revision) return
    const keys = new Set(started.map((upload) => upload.key))
    set({
      uploads: get().uploads.filter((upload) => !keys.has(upload.key)),
      draft: { ...get().draft, media: [...get().draft.media, ...added] },
      ...(failed && { error: errorMessage(failed.reason) }),
    })
  },
  removeMedia: (index) =>
    get().patch({ media: get().draft.media.filter((_, i) => i !== index) }),
  moveEarlier: (index) => {
    const media = [...get().draft.media]
    media.splice(index - 1, 0, ...media.splice(index, 1))
    get().patch({ media })
  },
  save: async () => {
    const state = get()
    if (state.pending) return null
    if (state.uploads.length > 0) {
      set({ error: "Wait for the uploads to finish." })
      return null
    }
    const when = new Date(state.draft.scheduledAt)
    if (Number.isNaN(when.getTime())) {
      set({
        fields: { scheduledFor: "Choose a date and time" },
        error: "Check the highlighted fields.",
      })
      return null
    }
    const scheduledFor = when.toISOString()
    const content = {
      kind: state.draft.kind,
      caption: state.draft.kind === "story" ? "" : state.draft.caption,
      media: state.draft.media,
      trialReel: state.draft.trialReel,
      scheduledFor,
    }
    const automation =
      state.automationOn &&
      state.draft.kind === "post" &&
      !state.post?.automationIds.length
        ? {
            ...responseForSave(state.response),
            name: automationName(state.draft, scheduledFor),
            status: "active" as const,
            keywords: keywordsOf(state.keywords),
            matchMode: "word" as const,
          }
        : null
    const input = {
      ...content,
      instagramAccountId: state.draft.instagramAccountId,
      automation,
    }
    const parsed = state.id
      ? updateScheduledPostSchema.safeParse({ ...content, automation })
      : schedulePostSchema.safeParse(input)
    if (!parsed.success) {
      set({
        fields: fieldsOf(parsed.error.issues),
        error: "Check the highlighted fields.",
      })
      return null
    }
    set({ pending: "save", fields: {}, error: null })
    const ownsDraft = () => get().revision === state.revision
    const workspaceId = useWorkspaceStore.getState().workspace?.id
    try {
      const post = state.id
        ? await api.scheduledPosts.update(state.id, { ...content, automation })
        : await api.scheduledPosts.create(input)
      // The lists belong to the workspace, so they take the change even after
      // the owner has left this draft.
      const current = () =>
        inWorkspace(workspaceId) && !get().removed.includes(post.id)
      if (current()) {
        // After leaving, a late result may be older than the calendar's copy,
        // so the calendar loads again instead.
        if (ownsDraft()) useCalendarStore.getState().applySaved(post)
        else void useCalendarStore.getState().load()
        if (automation && post.automationIds[0])
          void api.automations
            .get(post.automationIds[0])
            .then((item) => {
              // Deleting the post meanwhile took its automation with it.
              if (current()) useWorkspaceStore.getState().applySaved(item)
            })
            .catch(() => {
              // This optional cache read does not change the saved post.
            })
      }
      if (!ownsDraft()) return null
      // The server has saved both. A cache refresh cannot turn that success
      // into another creation attempt or leave Delete without a post id.
      set({ id: post.id, post })
      return post
    } catch (error) {
      if (ownsDraft())
        set({
          error: errorMessage(error),
          fields: error instanceof ApiClientError ? (error.fields ?? {}) : {},
        })
      return null
    } finally {
      if (ownsDraft()) set({ pending: null })
    }
  },
  remove: async () => {
    const { id, pending, revision } = get()
    if (!id || pending) return false
    const workspaceId = useWorkspaceStore.getState().workspace?.id
    set({ pending: "remove", error: null })
    try {
      await api.scheduledPosts.remove(id)
      set({ removed: [...get().removed, id] })
      if (inWorkspace(workspaceId)) {
        // After leaving, a load that started before the deletion may still
        // answer with the post, so the calendar loads again.
        if (get().revision === revision)
          useCalendarStore.getState().applyRemoved(id)
        else void useCalendarStore.getState().load()
        // Its automations were deleted with it.
        const workspace = useWorkspaceStore.getState()
        useWorkspaceStore.setState({
          automations: workspace.automations.filter(
            (item) =>
              item.trigger.postScope !== "scheduled_post" ||
              item.trigger.scheduledPost.id !== id
          ),
        })
      }
      return get().revision === revision
    } catch (error) {
      if (get().revision === revision) set({ error: errorMessage(error) })
      return false
    } finally {
      if (get().revision === revision) set({ pending: null })
    }
  },
}))
