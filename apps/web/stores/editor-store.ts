import { create } from "zustand"
import {
  POST_LIMITS,
  createAutomationSchema,
  updateAutomationSchema,
  type Automation,
  type AutomationActivityPage,
  type CreateAutomationInput,
  type InstagramPost,
  type ScheduledPost,
} from "@workspace/api/contract"
import { ApiClientError } from "@workspace/api/client"
import { keywordsOf } from "@/features/automations/automation-fields"
import { api } from "@/lib/api"
import { errorMessage, useWorkspaceStore } from "./workspace-store"

type EditorState = {
  revision: number
  draft: CreateAutomationInput
  id: string | null
  keywordText: string
  /** "Any word" was chosen; keywordText is kept for switching back. */
  anyWord: boolean
  /** Steps shown so far; an existing automation shows all of them. */
  step: number
  preview: "post" | "dm"
  posts: InstagramPost[]
  /** The account's posts still waiting to publish, which can trigger it too. */
  scheduledPosts: ScheduledPost[]
  status: "idle" | "loading" | "ready" | "error"
  postsLoading: boolean
  postsError: string | null
  scheduledPostsLoading: boolean
  scheduledPostsError: string | null
  /** Start of the period shown in the scheduled-post picker. */
  scheduledFrom: string
  error: string | null
  fields: Record<string, string>
  busy: boolean
  initialize: (id?: string) => Promise<void>
  patch: (patch: Partial<CreateAutomationInput>) => void
  next: () => void
  selectAccount: (id: string) => Promise<void>
  loadPosts: () => Promise<void>
  loadScheduledPosts: (direction?: number) => Promise<void>
  save: (status: "active" | "paused") => Promise<Automation | null>
}

export const LAST_STEP = 2
const DEFAULT_OPENING_DM = {
  message: "Thanks for the comment! Tap below and I'll send you the link.",
  buttonLabel: "Send me the link",
}

function emptyDraft(): CreateAutomationInput {
  return {
    name: "",
    instagramAccountId: "",
    trigger: { postScope: "specific_post", platformPostId: "" },
    keywords: [],
    matchMode: "word",
    openingDm: DEFAULT_OPENING_DM,
    dmMessage: "",
    dmButtons: [{ label: "", url: "" }],
    commentReply: null,
    requireFollow: false,
    productCarousel: null,
    followUp: null,
    status: "paused",
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  revision: 0,
  draft: emptyDraft(),
  id: null,
  keywordText: "",
  anyWord: false,
  step: 0,
  preview: "post",
  posts: [],
  scheduledPosts: [],
  status: "idle",
  postsLoading: false,
  postsError: null,
  scheduledPostsLoading: false,
  scheduledPostsError: null,
  scheduledFrom: "",
  error: null,
  fields: {},
  busy: false,
  patch: (patch) =>
    set({ draft: { ...get().draft, ...patch }, fields: {}, error: null }),
  next: () => {
    const step = Math.min(get().step + 1, LAST_STEP)
    set({ step, preview: step === LAST_STEP ? "dm" : "post" })
  },
  initialize: async (id) => {
    const revision = get().revision + 1
    set({
      revision,
      draft: emptyDraft(),
      id: id ?? null,
      keywordText: "",
      anyWord: false,
      step: id ? LAST_STEP : 0,
      preview: id ? "dm" : "post",
      posts: [],
      scheduledPosts: [],
      status: "loading",
      error: null,
      fields: {},
      postsError: null,
      postsLoading: false,
      scheduledPostsLoading: false,
      scheduledPostsError: null,
      scheduledFrom: "",
    })
    try {
      if (id) {
        const item = await api.automations.get(id)
        if (get().revision !== revision) return
        const draft: CreateAutomationInput = {
          ...item,
          productCarousel: item.productCarousel ?? null,
          followUp: item.followUp ?? null,
          trigger:
            item.trigger.postScope === "any_post"
              ? { postScope: "any_post" }
              : item.trigger.postScope === "scheduled_post"
                ? {
                    postScope: "scheduled_post",
                    scheduledPostId: item.trigger.scheduledPost.id,
                  }
                : {
                    postScope: "specific_post",
                    platformPostId: item.trigger.post.platformPostId,
                  },
        }
        set({
          draft,
          keywordText: item.keywords.join(", "),
          anyWord: item.keywords.length === 0,
          status: "ready",
        })
        await get().selectAccount(item.instagramAccountId)
      } else {
        set({ status: "ready" })
        const account = useWorkspaceStore
          .getState()
          .accounts.find((item) => item.status === "connected")
        if (account) await get().selectAccount(account.id)
      }
    } catch (error) {
      if (get().revision === revision)
        set({ status: "error", error: errorMessage(error) })
    }
  },
  selectAccount: async (id) => {
    set({
      revision: get().revision + 1,
      draft: { ...get().draft, instagramAccountId: id },
      posts: [],
      scheduledPosts: [],
      postsLoading: false,
      postsError: null,
      scheduledPostsLoading: false,
      scheduledPostsError: null,
      scheduledFrom: new Date().toISOString(),
    })
    // Each picker commits its own result and error as soon as it finishes.
    await Promise.all([get().loadPosts(), get().loadScheduledPosts()])
  },
  loadPosts: async () => {
    const { revision, draft } = get()
    set({ postsLoading: true, postsError: null })
    try {
      const posts = await api.accounts.posts(draft.instagramAccountId)
      if (get().revision === revision) set({ posts })
    } catch (error) {
      if (get().revision === revision) set({ postsError: errorMessage(error) })
    } finally {
      if (get().revision === revision) set({ postsLoading: false })
    }
  },
  loadScheduledPosts: async (direction = 0) => {
    const state = get()
    if (state.scheduledPostsLoading) return
    const period = POST_LIMITS.maxRangeDays * 86_400_000
    const from = new Date(
      Date.parse(state.scheduledFrom || new Date().toISOString()) +
        direction * period
    )
    const scheduledFrom = from.toISOString()
    const { trigger, instagramAccountId } = state.draft
    const chosen =
      trigger.postScope === "scheduled_post" ? trigger.scheduledPostId : null
    set({
      scheduledFrom,
      scheduledPostsLoading: true,
      scheduledPostsError: null,
    })
    try {
      const [upcoming, selected] = await Promise.allSettled([
        api.scheduledPosts.list({
          from: scheduledFrom,
          to: new Date(from.getTime() + period).toISOString(),
        }),
        // The chosen post may have published since, or be further ahead.
        chosen ? api.scheduledPosts.get(chosen) : null,
      ])
      if (get().revision !== state.revision) return
      const current = selected.status === "fulfilled" ? selected.value : null
      const scheduledPosts = (
        upcoming.status === "fulfilled" ? upcoming.value : []
      ).filter(
        (post) =>
          post.instagramAccountId === instagramAccountId &&
          post.status === "scheduled" &&
          post.kind === "post" &&
          post.id !== current?.id
      )
      if (current?.instagramAccountId === instagramAccountId)
        scheduledPosts.unshift(current)
      const failure = [upcoming, selected].find(
        (result) => result.status === "rejected"
      )
      set({
        scheduledPosts,
        scheduledPostsError: failure ? errorMessage(failure.reason) : null,
      })
    } catch (error) {
      if (get().revision === state.revision)
        set({ scheduledPostsError: errorMessage(error) })
    } finally {
      if (get().revision === state.revision)
        set({ scheduledPostsLoading: false })
    }
  },
  save: async (status) => {
    if (get().busy) return null
    const input = { ...get().draft, status, keywords: keywordsOf(get()) }
    const result = createAutomationSchema.safeParse(input)
    if (!result.success) {
      const fields: Record<string, string> = {}
      for (const issue of result.error.issues)
        fields[issue.path.join(".")] = issue.message
      set({ fields, error: "Check the highlighted fields." })
      return null
    }
    set({ busy: true, fields: {}, error: null })
    try {
      const id = get().id
      const item = id
        ? await api.automations.update(
            id,
            updateAutomationSchema.parse(result.data)
          )
        : await api.automations.create(result.data)
      useWorkspaceStore.getState().applySaved(item)
      return item
    } catch (error) {
      set({
        error: errorMessage(error),
        fields: error instanceof ApiClientError ? (error.fields ?? {}) : {},
      })
      return null
    } finally {
      set({ busy: false })
    }
  },
}))

type ActivityState = {
  page: AutomationActivityPage | null
  offset: number
  busy: boolean
  error: string | null
  load: (id: string, offset?: number) => Promise<void>
}
export const useActivityStore = create<ActivityState>((set) => ({
  page: null,
  offset: 0,
  busy: false,
  error: null,
  load: async (id, offset = 0) => {
    set({ busy: true, error: null, offset })
    try {
      set({ page: await api.automations.activity(id, offset) })
    } catch (error) {
      set({ page: null, error: errorMessage(error) })
    } finally {
      set({ busy: false })
    }
  },
}))
