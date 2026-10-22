import { create } from "zustand"
import {
  AUTOMATION_LIMITS,
  POST_LIMITS,
  crossPostSchema,
  platformProblems,
  updateScheduledPostSchema,
  type Account,
  type Platform,
  type PostKind,
  type PostMedia,
  type ScheduledPost,
  type TrialReel,
  type YouTubeSettings,
} from "@workspace/api/contract"
import { ApiClientError } from "@workspace/api/client"
import {
  keywordsOf,
  type KeywordDraft,
  type ResponseDraft,
} from "@/features/automations/automation-fields"
import { timeLabel } from "@/features/calendar/post-media"
import { localInput, suggestedTime } from "@/features/calendar/schedule-time"
import { api } from "@/lib/api"
import { responseForSave } from "@/lib/automation-draft"
import { fileProblem, uploadFiles } from "@/lib/media"
import { useCalendarStore } from "./calendar-store"
import { errorMessage, useWorkspaceStore } from "./workspace-store"

type Draft = {
  /** The accounts the post goes to, in the order they were chosen. */
  accountIds: string[]
  kind: PostKind
  /** The caption every account gets unless it has its own. */
  caption: string
  /** Captions that replace the shared one on an account, by account id. */
  captions: Record<string, string>
  /** Each YouTube account's video settings, by account id. */
  youtube: Record<string, YouTubeSettings>
  media: PostMedia[]
  trialReel: TrialReel | null
  /** Local date and time, as a datetime-local input holds it. */
  scheduledAt: string
}

const emptyDraft = (scheduledAt: string): Draft => ({
  accountIds: [],
  kind: "post",
  caption: "",
  captions: {},
  youtube: {},
  media: [],
  trialReel: null,
  scheduledAt,
})

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
  /** Whether each chosen account lets aghost publish; absent while unknown. */
  publishing: Record<string, boolean>
  /** Set once a post went to several accounts; the draft is then done. */
  scheduled: ScheduledPost[] | null
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
  /** A platform the owner is connecting in another tab, to add to the post. */
  connecting: Platform | null
  initialize: (id: string | null, day: string | null) => Promise<void>
  leave: () => void
  patch: (patch: Partial<Draft>) => void
  /** Adds the account to the post, or takes it off. */
  toggleAccount: (id: string) => Promise<void>
  /** Gives the account its own caption, starting from the shared one, or removes it. */
  customize: (id: string, on: boolean) => void
  setCaption: (id: string, caption: string) => void
  setYouTube: (id: string, patch: Partial<YouTubeSettings>) => void
  checkPublishing: (id: string) => Promise<void>
  addFiles: (files: File[]) => Promise<void>
  removeMedia: (index: number) => void
  /** Moves an item one place earlier; the first is the carousel's cover. */
  moveEarlier: (index: number) => void
  /** Connects an account in another tab; the post gets it once connected. */
  connect: (platform: Platform) => Promise<void>
  /** Reads the accounts again after another tab changed them. */
  channelsChanged: () => Promise<void>
  save: () => Promise<ScheduledPost[] | null>
  remove: () => Promise<boolean>
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

function accountsOf(draft: Draft): Account[] {
  const accounts = useWorkspaceStore.getState().accounts
  return draft.accountIds.flatMap((id) => {
    const account = accounts.find((item) => item.id === id)
    return account ? [account] : []
  })
}

/** Whether any chosen account is on Instagram, which has automations and Trial Reels. */
function hasInstagram(draft: Draft): boolean {
  return accountsOf(draft).some((account) => account.platform === "instagram")
}

/** The caption one account publishes. */
export function captionFor(draft: Draft, accountId: string): string {
  return draft.captions[accountId] ?? draft.caption
}

/** Where each chosen account's copy breaks its platform's rules, by field. */
function problemsOf(
  draft: Draft,
  automation: boolean,
  prefix: (index: number) => string
): Record<string, string> {
  const instagram = hasInstagram(draft)
  return Object.assign(
    {},
    ...accountsOf(draft).map((account, index) =>
      Object.fromEntries(
        Object.entries(
          platformProblems(account.platform, {
            kind: draft.kind,
            caption:
              draft.kind === "story"
                ? null
                : captionFor(draft, account.id).trim() || null,
            media: draft.media,
            trialReel:
              account.platform === "instagram" ? draft.trialReel : null,
            youtube:
              account.platform === "youtube"
                ? (draft.youtube[account.id] ?? null)
                : null,
            hasAutomation:
              automation && instagram && account.platform === "instagram",
          })
        ).map(([field, message]) => [`${prefix(index)}${field}`, message])
      )
    )
  )
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
  draft: emptyDraft(""),
  uploads: [],
  publishing: {},
  scheduled: null,
  automationOn: false,
  response: emptyResponse(),
  keywords: { keywordText: "", anyWord: false },
  preview: "post",
  status: "idle",
  error: null,
  fields: {},
  pending: null,
  removed: [],
  connecting: null,
  initialize: async (id, day) => {
    const revision = get().revision + 1
    set({
      revision,
      id,
      post: null,
      draft: emptyDraft(suggestedTime(day)),
      uploads: [],
      publishing: {},
      scheduled: null,
      automationOn: false,
      response: emptyResponse(),
      keywords: { keywordText: "", anyWord: false },
      preview: "post",
      status: "loading",
      error: null,
      fields: {},
      pending: null,
      connecting: null,
    })
    try {
      if (id) {
        const post = await api.scheduledPosts.get(id)
        // The owner opened another post, or a new one, meanwhile.
        if (get().revision !== revision) return
        set({
          post,
          draft: {
            ...emptyDraft(localInput(new Date(post.scheduledFor))),
            accountIds: [post.accountId],
            kind: post.kind,
            caption: post.caption ?? "",
            youtube: post.youtube ? { [post.accountId]: post.youtube } : {},
            media: post.media,
            trialReel: post.trialReel ?? null,
          },
          status: "ready",
        })
        if (post.status === "scheduled")
          await get().checkPublishing(post.accountId)
        return
      }
      set({ status: "ready" })
      const account = useWorkspaceStore
        .getState()
        .accounts.find((item) => item.status === "connected")
      if (account) await get().toggleAccount(account.id)
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
  patch: (patch) => {
    const draft = { ...get().draft, ...patch }
    set({
      draft: {
        ...draft,
        ...(patch.kind === "story" && {
          trialReel: null,
          // Only Instagram has stories.
          accountIds: accountsOf(draft)
            .filter((account) => account.platform === "instagram")
            .map((account) => account.id),
        }),
      },
      fields: {},
      error: null,
    })
  },
  toggleAccount: async (id) => {
    const { draft, post } = get()
    // A scheduled post stays on its account.
    if (post) return
    if (draft.accountIds.includes(id)) {
      const { [id]: _caption, ...captions } = draft.captions
      const { [id]: _youtube, ...youtube } = draft.youtube
      get().patch({
        accountIds: draft.accountIds.filter((item) => item !== id),
        captions,
        youtube,
      })
      return
    }
    const account = useWorkspaceStore
      .getState()
      .accounts.find((item) => item.id === id)
    if (!account) return
    get().patch({
      accountIds: [...draft.accountIds, id],
      // Stories are Instagram's, so another platform makes this a post.
      ...(account.platform !== "instagram" && { kind: "post" as const }),
      ...(account.platform === "youtube" && {
        youtube: {
          ...draft.youtube,
          [id]: { title: "", madeForKids: false },
        },
      }),
    })
    await get().checkPublishing(id)
  },
  checkPublishing: async (id) => {
    const revision = get().revision
    const current = () =>
      get().revision === revision && get().draft.accountIds.includes(id)
    try {
      const { canPublish } = await api.accounts.publishing(id)
      if (current())
        set({ publishing: { ...get().publishing, [id]: canPublish } })
    } catch (error) {
      if (current()) set({ error: errorMessage(error) })
    }
  },
  customize: (id, on) => {
    const { draft } = get()
    const { [id]: _removed, ...captions } = draft.captions
    get().patch({
      captions: on ? { ...captions, [id]: draft.caption } : captions,
    })
  },
  setCaption: (id, caption) =>
    get().patch({ captions: { ...get().draft.captions, [id]: caption } }),
  setYouTube: (id, patch) => {
    const youtube = get().draft.youtube
    const current = youtube[id] ?? { title: "", madeForKids: false }
    get().patch({ youtube: { ...youtube, [id]: { ...current, ...patch } } })
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
  connect: async (platform) => {
    set({ connecting: platform })
    await useWorkspaceStore.getState().connectInNewTab(platform)
    if (useWorkspaceStore.getState().error) set({ connecting: null })
  },
  channelsChanged: async () => {
    const { revision } = get()
    const known = new Set(
      useWorkspaceStore.getState().accounts.map((account) => account.id)
    )
    await useWorkspaceStore.getState().reloadAccounts()
    const { connecting, post, status } = get()
    if (get().revision !== revision || status !== "ready" || post) return
    if (!connecting) return
    set({ connecting: null })
    const added = useWorkspaceStore
      .getState()
      .accounts.filter(
        (account) =>
          !known.has(account.id) &&
          account.platform === connecting &&
          account.status === "connected"
      )
    for (const account of added) await get().toggleAccount(account.id)
  },
  save: async () => {
    const state = get()
    if (state.pending || state.scheduled) return null
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
    const { draft } = state
    const scheduledFor = when.toISOString()
    const instagram = hasInstagram(draft)
    const content = {
      kind: draft.kind,
      caption: draft.kind === "story" ? "" : draft.caption,
      media: draft.media,
      trialReel: instagram ? draft.trialReel : null,
      scheduledFor,
    }
    const automation =
      state.automationOn &&
      instagram &&
      draft.kind === "post" &&
      !state.post?.automationIds.length
        ? {
            ...responseForSave(state.response),
            name: automationName(draft, scheduledFor),
            status: "active" as const,
            keywords: keywordsOf(state.keywords),
            matchMode: "word" as const,
          }
        : null
    const editing = state.post
    const update = editing && {
      ...content,
      youtube: draft.youtube[editing.accountId] ?? null,
      automation,
    }
    const input = {
      ...content,
      targets: accountsOf(draft).map((account) => ({
        accountId: account.id,
        caption:
          draft.kind === "story" ? null : (draft.captions[account.id] ?? null),
        youtube: draft.youtube[account.id] ?? null,
      })),
      automation,
    }
    const parsed = update
      ? updateScheduledPostSchema.safeParse(update)
      : crossPostSchema.safeParse(input)
    // Each platform's limits, checked the way the server checks them.
    const problems = problemsOf(draft, automation !== null, (index) =>
      update ? "" : `targets.${index}.`
    )
    if (!parsed.success || Object.keys(problems).length > 0) {
      set({
        fields: {
          ...problems,
          ...(parsed.success ? {} : fieldsOf(parsed.error.issues)),
        },
        error: "Check the highlighted fields.",
      })
      return null
    }
    set({ pending: "save", fields: {}, error: null })
    const ownsDraft = () => get().revision === state.revision
    const workspaceId = useWorkspaceStore.getState().workspace?.id
    try {
      const posts = update
        ? [await api.scheduledPosts.update(editing.id, update)]
        : await api.scheduledPosts.create(input)
      // The lists belong to the workspace, so they take the change even after
      // the owner has left this draft.
      const current = (post: ScheduledPost) =>
        inWorkspace(workspaceId) && !get().removed.includes(post.id)
      for (const post of posts) {
        if (!current(post)) continue
        // After leaving, a late result may be older than the calendar's copy,
        // so the calendar loads again instead.
        if (ownsDraft()) useCalendarStore.getState().applySaved(post)
        if (automation && post.automationIds[0])
          void api.automations
            .get(post.automationIds[0])
            .then((item) => {
              // Deleting the post meanwhile took its automation with it.
              if (current(post)) useWorkspaceStore.getState().applySaved(item)
            })
            .catch(() => {
              // This optional cache read does not change the saved post.
            })
      }
      if (!ownsDraft()) {
        if (inWorkspace(workspaceId)) void useCalendarStore.getState().load()
        return null
      }
      // The server has saved them. A cache refresh cannot turn that success
      // into another creation attempt or leave Delete without a post id.
      if (posts.length === 1) set({ id: posts[0]!.id, post: posts[0]! })
      else set({ scheduled: posts })
      return posts
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
