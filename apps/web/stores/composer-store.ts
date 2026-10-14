import { create } from "zustand"
import {
  AUTOMATION_LIMITS,
  POST_LIMITS,
  createAutomationSchema,
  createMediaUploadSchema,
  schedulePostSchema,
  updateScheduledPostSchema,
  type PostKind,
  type PostMedia,
  type ScheduledPost,
} from "@workspace/api/contract"
import { ApiClientError } from "@workspace/api/client"
import {
  keywordsOf,
  type KeywordDraft,
  type ResponseDraft,
} from "@/features/automations/automation-fields"
import { timeLabel } from "@/features/calendar/post-media"
import { api } from "@/lib/api"
import { useCalendarStore } from "./calendar-store"
import { errorMessage, useWorkspaceStore } from "./workspace-store"

type Draft = {
  instagramAccountId: string
  kind: PostKind
  caption: string
  media: PostMedia[]
  /** Local date and time, as a datetime-local input holds it. */
  scheduledAt: string
}

/** A file on its way to storage. */
type Upload = { key: string; name: string }

type ComposerState = {
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
  busy: boolean
  initialize: (id: string | null, day: string | null) => Promise<void>
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

export const useComposerStore = create<ComposerState>((set, get) => ({
  id: null,
  post: null,
  draft: {
    instagramAccountId: "",
    kind: "post",
    caption: "",
    media: [],
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
  busy: false,
  initialize: async (id, day) => {
    set({
      id,
      post: null,
      draft: {
        instagramAccountId: "",
        kind: "post",
        caption: "",
        media: [],
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
    })
    try {
      if (id) {
        const post = await api.scheduledPosts.get(id)
        // The owner opened another post, or a new one, meanwhile.
        if (get().id !== id) return
        set({
          post,
          draft: {
            instagramAccountId: post.instagramAccountId,
            kind: post.kind,
            caption: post.caption ?? "",
            media: post.media,
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
      if (get().id === id) set({ status: "error", error: errorMessage(error) })
    }
  },
  patch: (patch) =>
    set({ draft: { ...get().draft, ...patch }, fields: {}, error: null }),
  selectAccount: async (id) => {
    set({
      draft: { ...get().draft, instagramAccountId: id },
      canPublish: null,
      error: null,
    })
    try {
      const { canPublish } = await api.accounts.publishing(id)
      if (get().draft.instagramAccountId === id) set({ canPublish })
    } catch (error) {
      if (get().draft.instagramAccountId === id)
        set({ error: errorMessage(error) })
    }
  },
  addFiles: async (files) => {
    const { draft, uploads } = get()
    const room =
      (draft.kind === "story" ? 1 : POST_LIMITS.maxMediaItems) -
      draft.media.length -
      uploads.length
    if (files.length > room) {
      set({
        error:
          draft.kind === "story"
            ? "A story has one photo or video."
            : `A post can have up to ${POST_LIMITS.maxMediaItems} photos or videos.`,
      })
      return
    }
    for (const file of files) {
      const checked = createMediaUploadSchema.safeParse({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      })
      if (!checked.success) {
        set({ error: `${file.name}: ${checked.error.issues[0]!.message}` })
        return
      }
    }
    const started = files.map((file) => ({
      key: crypto.randomUUID(),
      name: file.name,
    }))
    set({ uploads: [...get().uploads, ...started], error: null, fields: {} })
    // Uploads run together; the files keep the order they were chosen in.
    const results = await Promise.allSettled(files.map(api.media.upload))
    const added = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    )
    const failed = results.find((result) => result.status === "rejected")
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
    if (state.busy) return null
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
      scheduledFor,
    }
    const automation =
      state.automationOn &&
      state.draft.kind === "post" &&
      !state.post?.automationIds.length
        ? {
            ...state.response,
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
      ? updateScheduledPostSchema.safeParse(content)
      : schedulePostSchema.safeParse(input)
    // An automation added to a post that is already scheduled is checked on
    // its own; its fields read as the post's automation fields.
    const added =
      state.id && automation
        ? createAutomationSchema.safeParse({
            ...automation,
            instagramAccountId: state.draft.instagramAccountId,
            trigger: { postScope: "scheduled_post", scheduledPostId: state.id },
          })
        : null
    if (!parsed.success || (added && !added.success)) {
      set({
        fields: {
          ...(parsed.success ? {} : fieldsOf(parsed.error.issues)),
          ...(added?.success === false &&
            fieldsOf(
              added.error.issues.map((issue) => ({
                ...issue,
                path: ["automation", ...issue.path],
              }))
            )),
        },
        error: "Check the highlighted fields.",
      })
      return null
    }
    set({ busy: true, fields: {}, error: null })
    // Field errors from the automation request name its own fields.
    let prefix = ""
    try {
      let post = state.id
        ? await api.scheduledPosts.update(state.id, content)
        : await api.scheduledPosts.create(input)
      useCalendarStore.getState().applySaved(post)
      set({ post })
      if (added?.success) {
        prefix = "automation."
        const created = await api.automations.create(added.data)
        useWorkspaceStore.getState().applySaved(created)
        post = { ...post, automationIds: [created.id] }
        useCalendarStore.getState().applySaved(post)
        set({ post })
      } else if (!state.id && post.automationIds[0]) {
        useWorkspaceStore
          .getState()
          .applySaved(await api.automations.get(post.automationIds[0]))
      }
      return post
    } catch (error) {
      const fields = error instanceof ApiClientError ? (error.fields ?? {}) : {}
      set({
        error: errorMessage(error),
        fields: Object.fromEntries(
          Object.entries(fields).map(([path, message]) => [
            `${prefix}${path}`,
            message,
          ])
        ),
      })
      return null
    } finally {
      set({ busy: false })
    }
  },
  remove: async () => {
    const { id, busy } = get()
    if (!id || busy) return false
    set({ busy: true, error: null })
    try {
      await api.scheduledPosts.remove(id)
      useCalendarStore.getState().applyRemoved(id)
      // Its automations were deleted with it.
      const workspace = useWorkspaceStore.getState()
      useWorkspaceStore.setState({
        automations: workspace.automations.filter(
          (item) =>
            item.trigger.postScope !== "scheduled_post" ||
            item.trigger.scheduledPost.id !== id
        ),
      })
      return true
    } catch (error) {
      set({ error: errorMessage(error) })
      return false
    } finally {
      set({ busy: false })
    }
  },
}))
