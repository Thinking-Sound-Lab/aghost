"use client"

import { useEffect, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpLeft,
  ExternalLink,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react"
import {
  MEDIA_CONTENT_TYPES,
  POST_LIMITS,
  type PostKind,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  Field,
  Loading,
  Panel,
} from "@/components/interface"
import { Instagram } from "@/components/instagram-icon"
import {
  AutomationFields,
  Card,
  keywordsOf,
  Step,
} from "@/features/automations/automation-fields"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { STATUS } from "@/features/calendar/calendar"
import {
  MediaThumb,
  previewOf,
  timeLabel,
} from "@/features/calendar/post-media"
import { localInput, useComposerStore } from "@/stores/composer-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

const ACCEPT = Object.keys(MEDIA_CONTENT_TYPES).join(",")
const KINDS: { kind: PostKind; label: string }[] = [
  { kind: "post", label: "Post or reel" },
  { kind: "story", label: "Story" },
]
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function PostComposer({
  id,
  day,
}: {
  id: string | null
  day: string | null
}) {
  const composer = useComposerStore()
  const workspace = useWorkspaceStore()
  const router = useRouter()
  // A saved post stays locked until the calendar shows. Until then a new
  // post's page keeps its title and button, chosen by the address.
  const [leaving, startLeaving] = useTransition()
  const initialize = composer.initialize
  useEffect(() => {
    void initialize(id, day)
    return () => useComposerStore.getState().leave()
  }, [id, day, initialize])

  if (composer.status === "idle" || composer.status === "loading")
    return <Loading />
  if (composer.status === "error")
    return (
      <Panel className="flex-1 p-10">
        <ErrorBanner
          message={composer.error}
          retry={() => void composer.initialize(id, day)}
        />
      </Panel>
    )

  const { draft, fields, post } = composer
  const accounts = workspace.accounts.filter(
    (item) =>
      item.status === "connected" || item.id === draft.instagramAccountId
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

  const account = accounts.find((item) => item.id === draft.instagramAccountId)
  const editable = !post || post.status === "scheduled"
  const story = draft.kind === "story"
  const linked = post?.automationIds[0] ?? null
  const automationFields = Object.fromEntries(
    Object.entries(fields)
      .filter(([path]) => path.startsWith("automation."))
      .map(([path, message]) => [path.slice("automation.".length), message])
  )
  const screen = story ? "story" : composer.preview
  const room =
    (story || draft.trialReel ? 1 : POST_LIMITS.maxMediaItems) -
    draft.media.length -
    composer.uploads.length

  const saving = composer.pending === "save" || leaving
  const busy = composer.pending !== null || leaving

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await composer.save()) startLeaving(() => router.push("/calendar"))
  }
  async function remove() {
    if (await composer.remove()) router.push("/calendar")
  }

  return (
    <div className="flex min-h-0 flex-1">
      <Panel className="w-full lg:w-[560px] lg:shrink-0">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-2 px-4 pt-6 pb-6 md:px-10 md:pt-10 md:pb-8">
            <Link
              href="/calendar"
              aria-label="Back to calendar"
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "-ml-2",
              })}
            >
              <ArrowLeft />
            </Link>
            <h1 className="mr-auto text-xl font-semibold tracking-tight">
              {id ? (editable ? "Edit post" : "Post") : "New post"}
            </h1>
            {id &&
              post &&
              post.status !== "publishing" &&
              post.status !== "published" && (
                <ConfirmButton
                  title="Delete this post?"
                  description={
                    linked
                      ? "It won't be published, and its automation is deleted too."
                      : "It won't be published."
                  }
                  confirmLabel="Delete"
                  busy={busy}
                  onConfirm={remove}
                >
                  Delete
                </ConfirmButton>
              )}
          </header>

          <div className="grid min-h-0 flex-1 content-start gap-10 overflow-auto px-4 pb-10 md:px-10">
            {post && !editable && (
              <div className="grid gap-2 rounded-md bg-muted p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      STATUS[post.status].dot
                    )}
                  />
                  {STATUS[post.status].label}
                  <span className="font-normal text-muted-foreground">
                    · {timeLabel(post.publishedAt ?? post.scheduledFor)}
                  </span>
                </p>
                {post.error && <p className="text-destructive">{post.error}</p>}
                {post.permalink && (
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 justify-self-start underline underline-offset-4"
                  >
                    View on Instagram
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}

            <Step
              title="Publish"
              onFocus={() => useComposerStore.setState({ preview: "post" })}
            >
              {accounts.length > 1 && (
                <select
                  aria-label="Instagram account"
                  value={draft.instagramAccountId}
                  disabled={!!post}
                  onChange={(event) =>
                    void composer.selectAccount(event.target.value)
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
              {editable && composer.canPublish === false && account && (
                <div className="flex items-center gap-3 rounded-md bg-muted p-4">
                  <p className="mr-auto text-sm">
                    Allow aghost to publish on @{account.username}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={workspace.busy}
                    onClick={() => void workspace.reconnect(account.id)}
                  >
                    Reconnect
                  </Button>
                </div>
              )}

              <div
                role="radiogroup"
                aria-label="Kind"
                className="flex gap-1 justify-self-start rounded-lg bg-muted p-1"
              >
                {KINDS.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    role="radio"
                    aria-checked={draft.kind === item.kind}
                    // A scheduled post keeps its kind; it can be deleted instead.
                    disabled={!!post}
                    onClick={() => composer.patch({ kind: item.kind })}
                    className={cn(
                      "h-7 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none",
                      draft.kind === item.kind &&
                        "bg-card font-medium text-foreground shadow-xs"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {fields.kind && (
                <p className="text-xs text-destructive">{fields.kind}</p>
              )}

              <div className="grid gap-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {draft.media.map((item, index) => (
                    <div
                      key={item.url}
                      className="group relative aspect-square overflow-hidden rounded-md bg-muted"
                    >
                      <MediaThumb media={item} />
                      {editable && (
                        <span className="absolute inset-x-1 top-1 flex justify-between opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                          {index > 0 ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon-xs"
                              aria-label={`Move item ${index + 1} earlier`}
                              onClick={() => composer.moveEarlier(index)}
                            >
                              <ArrowUpLeft />
                            </Button>
                          ) : (
                            <span />
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon-xs"
                            aria-label={`Remove item ${index + 1}`}
                            onClick={() => composer.removeMedia(index)}
                          >
                            <X />
                          </Button>
                        </span>
                      )}
                    </div>
                  ))}
                  {composer.uploads.map((upload) => (
                    <div
                      key={upload.key}
                      className="grid aspect-square place-items-center content-center gap-1 rounded-md bg-muted p-2 text-center"
                    >
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="w-full truncate text-[10px] text-muted-foreground">
                        {upload.name}
                      </span>
                    </div>
                  ))}
                  {editable && room > 0 && (
                    <label
                      className={cn(
                        "grid aspect-square cursor-pointer place-items-center content-center gap-1 rounded-md bg-muted text-xs text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring hover:text-foreground",
                        fields.media && "bg-destructive/10 text-destructive"
                      )}
                    >
                      <ImagePlus className="size-5" />
                      Add
                      <input
                        type="file"
                        disabled={busy || composer.uploads.length > 0}
                        accept={
                          draft.trialReel ? "video/mp4,video/quicktime" : ACCEPT
                        }
                        multiple={!story && !draft.trialReel}
                        className="sr-only"
                        onChange={(event) => {
                          const files = [...(event.target.files ?? [])]
                          event.target.value = ""
                          void composer.addFiles(files)
                        }}
                      />
                    </label>
                  )}
                </div>
                {editable && (
                  <span
                    className={cn(
                      "text-xs text-muted-foreground",
                      fields.media && "text-destructive"
                    )}
                  >
                    {fields.media ??
                      (story
                        ? "One photo or video, shown for 24 hours."
                        : draft.trialReel
                          ? "One video, shown to non-followers first."
                          : "One video posts as a reel. Add up to 10 for a carousel.")}
                  </span>
                )}
              </div>

              {!story && (editable || draft.trialReel) && (
                <Card
                  title={editable ? "Trial Reel" : "Trial Reel launch settings"}
                  enabled={draft.trialReel !== null}
                  onToggle={
                    editable
                      ? (on) =>
                          composer.patch({
                            trialReel: on
                              ? { graduationStrategy: "manual" }
                              : null,
                          })
                      : undefined
                  }
                >
                  <p className="text-xs text-muted-foreground">
                    {editable
                      ? "Show one video to non-followers first. Attach a comment-to-DM automation below."
                      : "This reel was scheduled to reach non-followers first."}
                  </p>
                  {draft.trialReel && (
                    <Field
                      error={fields["trialReel.graduationStrategy"]}
                      hint={
                        draft.trialReel.graduationStrategy === "automatic"
                          ? "Instagram decides whether to share it with everyone based on performance."
                          : "Share it with everyone later from the Instagram app."
                      }
                    >
                      <select
                        aria-label="Trial Reel sharing"
                        disabled={!editable}
                        value={draft.trialReel.graduationStrategy}
                        onChange={(event) =>
                          composer.patch({
                            trialReel: {
                              graduationStrategy:
                                event.target.value === "automatic"
                                  ? "automatic"
                                  : "manual",
                            },
                          })
                        }
                        className="h-8 w-full rounded-lg bg-card px-2 text-sm"
                      >
                        <option value="manual">
                          Share with everyone manually
                        </option>
                        <option value="automatic">
                          Share automatically if it performs well
                        </option>
                      </select>
                    </Field>
                  )}
                  {fields.trialReel && (
                    <p role="alert" className="text-xs text-destructive">
                      {fields.trialReel}
                    </p>
                  )}
                  {post?.status === "published" && (
                    <p className="text-xs text-muted-foreground">
                      These are the launch settings. Check Instagram to see
                      whether the reel has since been shared with everyone.
                    </p>
                  )}
                </Card>
              )}

              {!story && (
                <Field
                  error={fields.caption}
                  hint={`${draft.caption.length.toLocaleString()} / ${POST_LIMITS.captionMaxLength.toLocaleString()}`}
                >
                  <Textarea
                    aria-label="Caption"
                    placeholder="Write a caption…"
                    rows={4}
                    disabled={!editable}
                    maxLength={POST_LIMITS.captionMaxLength}
                    value={draft.caption}
                    onChange={(event) =>
                      composer.patch({ caption: event.target.value })
                    }
                  />
                </Field>
              )}
            </Step>

            <Step title="When">
              <Field
                error={fields.scheduledFor}
                hint={`Your time zone: ${timeZone}`}
              >
                <Input
                  type="datetime-local"
                  aria-label="Date and time"
                  required
                  disabled={!editable}
                  min={localInput(new Date())}
                  value={draft.scheduledAt}
                  onChange={(event) =>
                    composer.patch({ scheduledAt: event.target.value })
                  }
                  className="w-auto"
                />
              </Field>
            </Step>

            {!story && linked && (
              <Step title="Automation">
                <div className="flex items-center gap-3 rounded-md bg-muted p-4 text-sm">
                  <span className="mr-auto">
                    Comments on this post get an automated DM.
                  </span>
                  <Link
                    href={`/automations/${linked}`}
                    className={buttonVariants({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Edit automation
                  </Link>
                </div>
              </Step>
            )}
            {!story && !linked && editable && (
              <Card
                title="Send a DM to people who comment"
                enabled={composer.automationOn}
                onToggle={(on) =>
                  useComposerStore.setState({
                    automationOn: on,
                    preview: on ? "dm" : "post",
                    fields: {},
                  })
                }
              />
            )}
            {!story && !linked && editable && composer.automationOn && (
              <AutomationFields
                draft={composer.response}
                keywords={composer.keywords}
                fields={automationFields}
                showResponse
                autoFocus={false}
                onChange={(patch) =>
                  useComposerStore.setState({
                    response: { ...composer.response, ...patch },
                    fields: {},
                  })
                }
                onKeywords={(patch) =>
                  useComposerStore.setState({
                    keywords: { ...composer.keywords, ...patch },
                    fields: {},
                  })
                }
                onPreview={(preview) => useComposerStore.setState({ preview })}
              />
            )}
          </div>

          {editable && (
            <footer className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-8 md:px-10">
              <ErrorBanner
                message={composer.error}
                className="mr-auto py-1.5"
              />
              <Button
                type="submit"
                className="ml-auto"
                disabled={busy || composer.uploads.length > 0}
              >
                {saving && (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                )}
                {id ? "Save" : "Schedule"}
              </Button>
            </footer>
          )}
          {!editable && composer.error && (
            <footer className="px-4 pb-8 md:px-10">
              <ErrorBanner message={composer.error} />
            </footer>
          )}
        </form>
      </Panel>
      <Panel className="hidden flex-1 items-center justify-center overflow-auto bg-muted p-10 lg:flex">
        <InstagramPreview
          screen={screen}
          account={{
            username: account?.username ?? "",
            picture: account?.profilePictureUrl ?? null,
          }}
          post={previewOf({
            media: draft.media,
            caption: draft.caption.trim() || null,
          })}
          keyword={keywordsOf(composer.keywords)[0] ?? null}
          commentReply={
            composer.automationOn ? composer.response.commentReply : null
          }
          openingDm={composer.response.openingDm}
          dmMessage={composer.response.dmMessage}
          buttons={composer.response.dmButtons.map((item) => item.label)}
          productCarousel={
            composer.response.dmFormat === "carousel"
              ? (composer.response.productCarousel ?? null)
              : null
          }
          followUp={composer.response.followUp ?? null}
        />
      </Panel>
    </div>
  )
}
