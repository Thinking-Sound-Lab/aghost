import { create } from "zustand"
import {
  createAutomationSchema,
  updateAutomationSchema,
  type Automation,
  type AutomationActivityPage,
  type CreateAutomationInput,
  type InstagramPost,
} from "@workspace/api/contract"
import { ApiClientError } from "@workspace/api/client"
import { api } from "@/lib/api"
import { errorMessage, useWorkspaceStore } from "./workspace-store"

type EditorState = {
  draft: CreateAutomationInput
  id: string | null
  keywordText: string
  /** "Any word" was chosen; keywordText is kept for switching back. */
  anyWord: boolean
  /** Steps shown so far; an existing automation shows all of them. */
  step: number
  preview: "post" | "dm"
  posts: InstagramPost[]
  status: "idle" | "loading" | "ready" | "error"
  postsLoading: boolean
  postsError: string | null
  error: string | null
  fields: Record<string, string>
  busy: boolean
  initialize: (id?: string) => Promise<void>
  patch: (patch: Partial<CreateAutomationInput>) => void
  next: () => void
  selectAccount: (id: string) => Promise<void>
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
    status: "paused",
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  draft: emptyDraft(),
  id: null,
  keywordText: "",
  anyWord: false,
  step: 0,
  preview: "post",
  posts: [],
  status: "idle",
  postsLoading: false,
  postsError: null,
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
    set({
      draft: emptyDraft(),
      id: id ?? null,
      keywordText: "",
      anyWord: false,
      step: id ? LAST_STEP : 0,
      preview: "post",
      posts: [],
      status: "loading",
      error: null,
      fields: {},
      postsError: null,
    })
    try {
      if (id) {
        const item = await api.automations.get(id)
        const draft: CreateAutomationInput = {
          ...item,
          trigger:
            item.trigger.postScope === "any_post"
              ? { postScope: "any_post" }
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
      set({ status: "error", error: errorMessage(error) })
    }
  },
  selectAccount: async (id) => {
    set({
      draft: { ...get().draft, instagramAccountId: id },
      posts: [],
      postsLoading: true,
      postsError: null,
    })
    try {
      const posts = await api.accounts.posts(id)
      if (get().draft.instagramAccountId === id) set({ posts })
    } catch (error) {
      if (get().draft.instagramAccountId === id)
        set({ postsError: errorMessage(error) })
    } finally {
      if (get().draft.instagramAccountId === id) set({ postsLoading: false })
    }
  },
  save: async (status) => {
    if (get().busy) return null
    const input = {
      ...get().draft,
      status,
      keywords: get().anyWord
        ? []
        : get()
            .keywordText.split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    }
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
