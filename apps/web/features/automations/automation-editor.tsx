"use client"

import { useEffect, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { AUTOMATION_LIMITS, POST_LIMITS } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { EmptyState, ErrorBanner, Loading, Panel } from "@/components/interface"
import { Instagram } from "@/components/instagram-icon"
import {
  AutomationFields,
  keywordsOf,
  Option,
  Step,
} from "@/features/automations/automation-fields"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import {
  MediaThumb,
  previewOf,
  timeLabel,
} from "@/features/calendar/post-media"
import { LAST_STEP, useEditorStore } from "@/stores/editor-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

export function AutomationEditor({ id }: { id?: string }) {
  const editor = useEditorStore()
  const workspace = useWorkspaceStore()
  const router = useRouter()
  const initialize = editor.initialize
  useEffect(() => {
    void initialize(id)
  }, [id, initialize])

  if (editor.status === "idle" || editor.status === "loading")
    return <Loading />
  if (editor.status === "error")
    return (
      <Panel className="flex-1 p-10">
        <ErrorBanner
          message={editor.error}
          retry={() => void editor.initialize(id)}
        />
      </Panel>
    )

  const accounts = workspace.accounts.filter(
    (item) =>
      item.status === "connected" || item.id === editor.draft.instagramAccountId
  )
  if (accounts.length === 0)
    return (
      <Panel className="flex-1">
        <EmptyState icon={<Instagram />} title="Connect Instagram first">
          <Link
            href="/settings#channels"
            className={buttonVariants({ variant: "secondary" })}
          >
            Go to settings
          </Link>
        </EmptyState>
      </Panel>
    )

  const { draft, fields } = editor
  const account = accounts.find((item) => item.id === draft.instagramAccountId)
  const selectedPostId =
    draft.trigger.postScope === "specific_post"
      ? draft.trigger.platformPostId
      : null
  const selectedPost =
    editor.posts.find((post) => post.platformPostId === selectedPostId) ?? null
  const scheduledPostId =
    draft.trigger.postScope === "scheduled_post"
      ? draft.trigger.scheduledPostId
      : null
  const scheduledPost =
    editor.scheduledPosts.find((post) => post.id === scheduledPostId) ?? null
  const keywords = keywordsOf(editor)
  const show = (step: number) => editor.step >= step

  async function save(status: "active" | "paused") {
    if (await editor.save(status)) router.push("/automations")
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (editor.step < LAST_STEP) editor.next()
    else void save("active")
  }

  return (
    <div className="flex min-h-0 flex-1">
      <Panel className="w-[560px] shrink-0">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-2 px-10 pt-10 pb-8">
            <Link
              href="/automations"
              aria-label="Back to automations"
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "-ml-2",
              })}
            >
              <ArrowLeft />
            </Link>
            <input
              aria-label="Automation name"
              placeholder="Untitled automation"
              maxLength={AUTOMATION_LIMITS.nameMaxLength}
              value={draft.name}
              onChange={(event) => editor.patch({ name: event.target.value })}
              className={cn(
                "-ml-2 h-9 min-w-0 flex-1 rounded-lg px-2 text-xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus:bg-muted",
                fields.name && "bg-destructive/10"
              )}
            />
          </header>
          <div className="grid min-h-0 flex-1 content-start gap-10 overflow-auto px-10 pb-10">
            <Step
              title="When someone comments on"
              onFocus={() => useEditorStore.setState({ preview: "post" })}
            >
              {accounts.length > 1 && (
                <select
                  aria-label="Instagram account"
                  value={draft.instagramAccountId}
                  onChange={(event) =>
                    void editor.selectAccount(event.target.value)
                  }
                  className="h-8 rounded-lg bg-input/50 px-2 text-sm"
                >
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      @{item.username}
                    </option>
                  ))}
                </select>
              )}
              <Option
                name="post"
                label="a specific post or reel"
                checked={draft.trigger.postScope === "specific_post"}
                onSelect={() =>
                  editor.patch({
                    trigger: {
                      postScope: "specific_post",
                      platformPostId: selectedPostId ?? "",
                    },
                  })
                }
              >
                <PostPicker />
                {fields["trigger.platformPostId"] && (
                  <p className="mt-2 text-xs text-destructive">
                    {fields["trigger.platformPostId"]}
                  </p>
                )}
              </Option>
              <Option
                name="post"
                label="a post scheduled in the calendar"
                checked={draft.trigger.postScope === "scheduled_post"}
                onSelect={() =>
                  editor.patch({
                    trigger: {
                      postScope: "scheduled_post",
                      scheduledPostId:
                        scheduledPostId ?? editor.scheduledPosts[0]?.id ?? "",
                    },
                  })
                }
              >
                <ScheduledPostPicker />
                {fields["trigger.scheduledPostId"] && (
                  <p className="mt-2 text-xs text-destructive">
                    {fields["trigger.scheduledPostId"]}
                  </p>
                )}
              </Option>
              <Option
                name="post"
                label="any post or reel"
                checked={draft.trigger.postScope === "any_post"}
                onSelect={() =>
                  editor.patch({ trigger: { postScope: "any_post" } })
                }
              />
            </Step>

            {show(1) && (
              <AutomationFields
                draft={draft}
                keywords={editor}
                fields={fields}
                showResponse={show(2)}
                autoFocus={!id}
                onChange={editor.patch}
                onKeywords={(patch) =>
                  useEditorStore.setState({ ...patch, fields: {} })
                }
                onPreview={(preview) => useEditorStore.setState({ preview })}
              />
            )}
          </div>
          <footer className="flex shrink-0 items-center gap-2 px-10 pt-4 pb-8">
            <ErrorBanner message={editor.error} className="mr-auto py-1.5" />
            {editor.step < LAST_STEP ? (
              <Button type="submit" className="ml-auto">
                Next
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="ml-auto"
                  disabled={editor.busy}
                  onClick={() => void save("paused")}
                >
                  Save draft
                </Button>
                <Button type="submit" disabled={editor.busy}>
                  Go live
                </Button>
              </>
            )}
          </footer>
        </form>
      </Panel>
      <Panel className="flex-1 items-center justify-center overflow-auto bg-muted p-10">
        <InstagramPreview
          screen={editor.preview}
          account={{
            username: account?.username ?? "",
            picture: account?.profilePictureUrl ?? null,
          }}
          post={
            draft.trigger.postScope === "specific_post"
              ? selectedPost
              : draft.trigger.postScope === "scheduled_post"
                ? scheduledPost && previewOf(scheduledPost)
                : (editor.posts[0] ?? null)
          }
          keyword={keywords[0] ?? null}
          commentReply={draft.commentReply}
          openingDm={draft.openingDm}
          dmMessage={draft.dmMessage}
          buttons={draft.dmButtons.map((item) => item.label)}
        />
      </Panel>
    </div>
  )
}

function PostPicker() {
  const editor = useEditorStore()
  const selected =
    editor.draft.trigger.postScope === "specific_post"
      ? editor.draft.trigger.platformPostId
      : null
  if (editor.postsLoading)
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className="aspect-square animate-pulse rounded-md bg-card"
          />
        ))}
      </div>
    )
  if (editor.postsError)
    return (
      <ErrorBanner
        message={editor.postsError}
        retry={() => void editor.loadPosts()}
      />
    )
  if (editor.posts.length === 0)
    return <p className="text-sm text-muted-foreground">No posts yet.</p>
  const choose = (platformPostId: string) =>
    editor.patch({ trigger: { postScope: "specific_post", platformPostId } })
  // A chosen post from further down the list stays visible in the row.
  const row = editor.posts.slice(0, 4)
  const chosen = editor.posts.find((post) => post.platformPostId === selected)
  if (chosen && !row.includes(chosen)) row[3] = chosen
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-4 gap-1.5">
        {row.map((post) => (
          <Thumbnail
            key={post.platformPostId}
            post={post}
            selected={post.platformPostId === selected}
            onSelect={() => choose(post.platformPostId)}
          />
        ))}
      </div>
      {editor.posts.length > 4 && (
        <Dialog>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="link"
                size="sm"
                className="justify-self-start px-0"
              />
            }
          >
            Show all
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogTitle>Choose a post or reel</DialogTitle>
            <div className="grid max-h-[60vh] grid-cols-4 gap-1.5 overflow-auto">
              {editor.posts.map((post) => (
                <Thumbnail
                  key={post.platformPostId}
                  post={post}
                  selected={post.platformPostId === selected}
                  onSelect={() => choose(post.platformPostId)}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/** Posts waiting to publish: the automation starts once one goes out. */
function ScheduledPostPicker() {
  const editor = useEditorStore()
  const selected =
    editor.draft.trigger.postScope === "scheduled_post"
      ? editor.draft.trigger.scheduledPostId
      : null
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Earlier scheduled posts"
          disabled={editor.scheduledPostsLoading}
          onClick={() => void editor.loadScheduledPosts(-1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {editor.scheduledFrom && (
            <>
              {new Date(editor.scheduledFrom).toLocaleDateString()} –{" "}
              {new Date(
                Date.parse(editor.scheduledFrom) +
                  POST_LIMITS.maxRangeDays * 86_400_000
              ).toLocaleDateString()}
            </>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Later scheduled posts"
          disabled={editor.scheduledPostsLoading}
          onClick={() => void editor.loadScheduledPosts(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <ErrorBanner
        message={editor.scheduledPostsError}
        retry={() => void editor.loadScheduledPosts()}
      />
      {editor.scheduledPostsLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading scheduled posts…
        </p>
      ) : editor.scheduledPosts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No posts scheduled in this period.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {editor.scheduledPosts.map((post) => (
            <button
              key={post.id}
              type="button"
              aria-pressed={post.id === selected}
              title={post.caption ?? undefined}
              onClick={() =>
                editor.patch({
                  trigger: {
                    postScope: "scheduled_post",
                    scheduledPostId: post.id,
                  },
                })
              }
              className={cn(
                "relative aspect-square overflow-hidden rounded-md bg-card text-left ring-offset-2 ring-offset-muted",
                post.id === selected && "ring-2 ring-foreground"
              )}
            >
              <MediaThumb media={post.media[0]!} />
              <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white">
                {timeLabel(post.scheduledFor)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Thumbnail({
  post,
  selected,
  onSelect,
}: {
  post: { thumbnailUrl: string | null; caption: string | null }
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={post.caption ?? undefined}
      onClick={onSelect}
      className={cn(
        "relative aspect-square overflow-hidden rounded-md bg-card text-left ring-offset-2 ring-offset-muted",
        selected && "ring-2 ring-foreground"
      )}
    >
      {post.thumbnailUrl ? (
        <Image
          src={post.thumbnailUrl}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        <span className="line-clamp-4 p-1.5 text-[10px] text-muted-foreground">
          {post.caption}
        </span>
      )}
    </button>
  )
}
