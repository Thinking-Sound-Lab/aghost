"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Eye,
  Loader2,
  PanelRight,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react"
import {
  PLATFORMS,
  PLATFORM_RULES,
  accountLabel,
  type Account,
  type Platform,
  type PostKind,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { NativeSelect } from "@workspace/ui/components/native-select"
import {
  Avatar,
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  Field,
  Loading,
  Panel,
} from "@/components/interface"
import { ChannelAvatar, PlatformIcon } from "@/components/platform-icon"
import {
  AutomationFields,
  Card,
  keywordsOf,
  Step,
} from "@/features/automations/automation-fields"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { STATUS } from "@/features/calendar/month-grid"
import {
  INLINE_FIELDS,
  PostContentEditor,
} from "@/features/calendar/post-content-editor"
import { previewOf, timeLabel } from "@/features/calendar/post-media"
import { PostPreview } from "@/features/calendar/post-preview"
import { ScheduleDialog } from "@/features/calendar/schedule-dialog"
import { onAccountsChanged } from "@/lib/account-events"
import { captionFor, useComposerStore } from "@/stores/composer-store"
import { useActiveSet } from "@/stores/social-set-store"
import { canConnect, useWorkspaceStore } from "@/stores/workspace-store"

const KINDS: { value: PostKind; label: string }[] = [
  { value: "post", label: "Post or reel" },
  { value: "story", label: "Story" },
]
export function PostComposer({
  id,
  day,
}: {
  id: string | null
  day: string | null
}) {
  const composer = useComposerStore()
  const workspace = useWorkspaceStore()
  const socialSet = useActiveSet()
  const router = useRouter()
  const [leaving, startLeaving] = useTransition()
  const [channel, setChannel] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [mobilePreview, setMobilePreview] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const tabsId = useId()
  const formId = useId()
  const editor = useRef<HTMLElement>(null)
  const initialize = composer.initialize
  useEffect(() => {
    void initialize(id, day)
    return () => useComposerStore.getState().leave()
  }, [id, day, initialize])
  // A channel connected in another tab joins the list, and the post.
  useEffect(
    () =>
      onAccountsChanged(
        () => void useComposerStore.getState().channelsChanged()
      ),
    []
  )

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
  // The set being shown, plus whatever a saved post was published on.
  const accounts = workspace.accounts.filter(
    (item) =>
      (item.socialSetId === socialSet?.id && item.status === "connected") ||
      draft.accountIds.includes(item.id)
  )
  if (accounts.length === 0)
    return (
      <Panel className="flex-1">
        <EmptyState icon={<Share2 />} title="Connect a channel first">
          <Link
            href="/settings#channels"
            className={buttonVariants({ variant: "secondary" })}
          >
            Go to settings
          </Link>
        </EmptyState>
      </Panel>
    )
  const chosen = draft.accountIds.flatMap((id) => {
    const account = accounts.find((item) => item.id === id)
    return account ? [account] : []
  })
  const active = chosen.find((item) => item.id === channel) ?? chosen[0] ?? null
  const onlyInstagram =
    chosen.length > 0 && chosen.every((item) => item.platform === "instagram")
  const editable = !post || post.status === "scheduled"
  const story = draft.kind === "story"
  const linked = post?.automationIds[0] ?? null
  const automationFields = Object.fromEntries(
    Object.entries(fields)
      .filter(([path]) => path.startsWith("automation."))
      .map(([path, message]) => [path.slice("automation.".length), message])
  )
  const saving = composer.pending === "save" || leaving
  const busy = composer.pending !== null || leaving
  const dmPreview =
    active?.platform === "instagram" &&
    composer.automationOn &&
    !story &&
    !linked &&
    editable
  /** A channel's problems from the last save; the editor shows some beside their input. */
  function problemsOf(index: number, skipInline: boolean): string[] {
    if (post) return []
    const prefix = `targets.${index}.`
    return [
      ...new Set(
        Object.entries(fields)
          .filter(
            ([path]) =>
              path.startsWith(prefix) &&
              !(skipInline && INLINE_FIELDS.includes(path.slice(prefix.length)))
          )
          .map(([, message]) => message)
      ),
    ]
  }
  const when = new Date(draft.scheduledAt)
  const scheduledLabel = Number.isNaN(when.getTime())
    ? "Choose a time"
    : timeLabel(when.toISOString())
  const general = [fields.targets, fields.kind, fields.scheduledFor].filter(
    (message): message is string => !!message
  )

  function selectChannel(value: string) {
    setChannel(value)
    editor.current?.scrollTo({ top: 0 })
    useComposerStore.setState({ preview: "post" })
  }
  /** Opens the channel whose content the save turned down. */
  function revealProblems() {
    const paths = Object.keys(useComposerStore.getState().fields)
    const failed = (item: Account, index: number) =>
      paths.some((path) => path.startsWith(`targets.${index}.`)) ||
      (item.platform === "instagram" &&
        paths.some(
          (path) =>
            path.startsWith("automation.") || path.startsWith("trialReel")
        ))
    const index = chosen.findIndex((item) => item.id === active?.id)
    if (!active || !failed(active, index)) {
      const next = chosen.find(failed)
      if (next) setChannel(next.id)
    }
    editor.current?.scrollTo({ top: 0 })
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    // A new post is confirmed in the schedule dialog first.
    if (!post && !scheduling) return setScheduling(true)
    if (await composer.save()) startLeaving(() => router.push("/calendar"))
    else if (!useComposerStore.getState().fields.scheduledFor) {
      setScheduling(false)
      revealProblems()
    }
  }
  async function remove() {
    if (await composer.remove()) router.push("/calendar")
  }

  return (
    <form
      id={formId}
      onSubmit={submit}
      className="flex min-h-0 min-w-0 flex-1 bg-card"
    >
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          mobilePreview && "hidden lg:flex"
        )}
      >
        <header className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2.5 md:px-4">
          <Link
            href="/calendar"
            aria-label="Back to calendar"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ArrowLeft />
          </Link>
          <h1 className="sr-only">
            {id ? (editable ? "Edit post" : "Post") : "New post"}
          </h1>
          {chosen.length > 0 && (
            <div
              role="tablist"
              aria-label="Channels"
              className="flex max-w-full min-w-0 gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5"
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key
                  )
                )
                  return
                const tabs = [
                  ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]'
                  ),
                ]
                const index = tabs.indexOf(
                  document.activeElement as HTMLButtonElement
                )
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length
                event.preventDefault()
                tabs[next]?.focus()
                tabs[next]?.click()
              }}
            >
              {chosen.map((item, index) => {
                const selected = item.id === active?.id
                const name = PLATFORM_RULES[item.platform].name
                const failed = problemsOf(index, false).length > 0
                const twin = chosen.some(
                  (other) =>
                    other.id !== item.id && other.platform === item.platform
                )
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`${tabsId}-${item.id}`}
                    aria-controls={`${tabsId}-content`}
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    title={`${name} · ${accountLabel(item)}`}
                    aria-label={`${name}, ${accountLabel(item)}${failed ? ", needs changes" : ""}`}
                    onClick={() => selectChannel(item.id)}
                    className={cn(
                      "relative flex h-7 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                      selected &&
                        "bg-card text-foreground shadow-xs dark:bg-accent"
                    )}
                  >
                    <PlatformIcon platform={item.platform} size={15} />
                    {twin && (
                      <Avatar
                        src={item.profilePictureUrl}
                        name={item.username}
                        className="size-4 text-[8px]"
                      />
                    )}
                    {(failed || item.id in draft.captions) && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-1 right-1 size-1.5 rounded-full",
                          failed ? "bg-destructive" : "bg-foreground/60"
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {!post && (
            <ChannelMenu
              accounts={accounts}
              selected={draft.accountIds}
              disabled={busy}
              canConnect={(platform) =>
                socialSet !== null &&
                !workspace.busy &&
                canConnect(workspace, socialSet.id, platform)
              }
              onToggle={(accountId) => void composer.toggleAccount(accountId)}
              onConnect={(platform) => void composer.connect(platform)}
            />
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {editable && post && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                title="Change when it publishes"
                onClick={() => setScheduling(true)}
                className="font-normal text-muted-foreground"
              >
                <CalendarClock data-icon="inline-start" />
                {scheduledLabel}
              </Button>
            )}
            {editable && (
              <Button
                type={post ? "submit" : "button"}
                disabled={busy || composer.uploads.length > 0}
                onClick={post ? undefined : () => setScheduling(true)}
              >
                {saving && (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                )}
                {post ? "Save" : "Schedule"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Show preview"
              className="lg:hidden"
              onClick={() => setMobilePreview(true)}
            >
              <Eye />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Preview"
              title={previewOpen ? "Hide preview" : "Show preview"}
              aria-pressed={previewOpen}
              className="hidden lg:inline-flex"
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              <PanelRight />
            </Button>
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
                  <Trash2 />
                  <span className="sr-only">Delete post</span>
                </ConfirmButton>
              )}
          </div>
        </header>
        <section
          ref={editor}
          role="tabpanel"
          id={`${tabsId}-content`}
          aria-labelledby={active ? `${tabsId}-${active.id}` : undefined}
          className="relative min-h-0 flex-1 overflow-y-auto"
        >
          <div
            className={cn(
              "mx-auto grid w-full content-start gap-6 px-5 pt-6 pb-16 md:pt-10",
              active?.platform === "instagram" ? "max-w-[470px]" : "max-w-xl"
            )}
          >
            {post && !editable && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-muted px-3 py-2.5 text-sm">
                <span
                  className={cn("size-2 rounded-full", STATUS[post.status].dot)}
                />
                <span className="font-medium">{STATUS[post.status].label}</span>
                <span className="text-muted-foreground">
                  · {timeLabel(post.publishedAt ?? post.scheduledFor)}
                </span>
                {post.permalink && (
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    View on {PLATFORM_RULES[post.platform].name}
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                {post.error && (
                  <p className="basis-full text-destructive">{post.error}</p>
                )}
              </div>
            )}
            {(composer.error || general.length > 0) && (
              <div className="grid gap-1.5">
                <ErrorBanner message={composer.error} />
                {general.map((message) => (
                  <p
                    key={message}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {message}
                  </p>
                ))}
              </div>
            )}
            {chosen.map((item, index) => {
              const problems = problemsOf(index, item.id === active?.id)
              if (!problems.length) return null
              return (
                <div
                  key={item.id}
                  role="alert"
                  className="grid gap-1 rounded-md bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
                >
                  {item.id === active?.id ? (
                    <span className="flex items-center gap-2 font-medium">
                      <PlatformIcon platform={item.platform} />
                      {accountLabel(item)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectChannel(item.id)}
                      className="flex items-center gap-2 justify-self-start font-medium underline underline-offset-4"
                    >
                      <PlatformIcon platform={item.platform} />
                      {PLATFORM_RULES[item.platform].name}: {accountLabel(item)}
                    </button>
                  )}
                  {problems.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </div>
              )
            })}
            {editable &&
              chosen
                .filter((item) => composer.publishing[item.id] === false)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5"
                  >
                    <p className="mr-auto text-sm">
                      Allow aghost to publish on {accountLabel(item)}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={workspace.busy || busy}
                      onClick={() => void workspace.reconnect(item.id)}
                    >
                      Reconnect
                    </Button>
                  </div>
                ))}
            {onlyInstagram && (
              <Segmented
                label="Kind"
                value={draft.kind}
                options={KINDS}
                disabled={!!post || busy}
                onChange={(kind) => composer.patch({ kind })}
              />
            )}
            {active ? (
              <div
                onFocus={() => useComposerStore.setState({ preview: "post" })}
              >
                <PostContentEditor
                  account={active}
                  chosen={chosen}
                  editable={editable}
                  busy={busy}
                />
              </div>
            ) : (
              <EmptyState icon={<Share2 />} title="Choose where to publish">
                <div className="flex flex-wrap justify-center gap-2">
                  {accounts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={busy || item.status !== "connected"}
                      onClick={() => void composer.toggleAccount(item.id)}
                      className="flex min-h-9 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                    >
                      <ChannelAvatar account={item} className="size-6" />
                      <span className="max-w-36 truncate">
                        {accountLabel(item)}
                      </span>
                    </button>
                  ))}
                </div>
              </EmptyState>
            )}
            {active?.platform === "youtube" && (
              <Card
                title="Made for kids"
                enabled={draft.youtube[active.id]?.madeForKids ?? false}
                onToggle={
                  editable && !busy
                    ? (on) =>
                        composer.setYouTube(active.id, { madeForKids: on })
                    : undefined
                }
              />
            )}
            {active?.platform === "instagram" &&
              !story &&
              (editable || draft.trialReel) && (
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
                      ? onlyInstagram
                        ? "Show one video to non-followers first."
                        : "On Instagram, show the video to non-followers first. Other channels post it as usual."
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
                      <NativeSelect
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
                        className="rounded-lg border-transparent bg-card"
                      >
                        <option value="manual">
                          Share with everyone manually
                        </option>
                        <option value="automatic">
                          Share automatically if it performs well
                        </option>
                      </NativeSelect>
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
            {active?.platform === "instagram" && !story && linked && (
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
            {active?.platform === "instagram" &&
              !story &&
              !linked &&
              editable && (
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
            {dmPreview && (
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
        </section>
      </div>
      <aside
        aria-label="Preview"
        className={cn(
          "min-h-0 w-full shrink-0 flex-col border-l bg-muted/50 lg:w-[26rem] xl:w-[30rem]",
          mobilePreview ? "flex" : "hidden",
          previewOpen ? "lg:flex" : "lg:hidden"
        )}
      >
        <div className="flex h-[52px] shrink-0 items-center gap-2 px-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back to editor"
            className="lg:hidden"
            onClick={() => setMobilePreview(false)}
          >
            <X />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Hide preview"
            className="hidden lg:inline-flex"
            onClick={() => setPreviewOpen(false)}
          >
            <X />
          </Button>
          {active && (
            <span className="truncate text-xs text-muted-foreground">
              {PLATFORM_RULES[active.platform].name} preview
            </span>
          )}
          {dmPreview && (
            <div className="ml-auto">
              <Segmented
                label="Preview screen"
                value={composer.preview}
                options={[
                  { value: "post", label: "Post" },
                  { value: "dm", label: "DM" },
                ]}
                onChange={(preview) => useComposerStore.setState({ preview })}
              />
            </div>
          )}
        </div>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 xl:px-6 xl:pb-6">
          {!active ? (
            <p className="grid h-full place-content-center text-center text-sm text-muted-foreground">
              Choose a channel to see a preview.
            </p>
          ) : dmPreview && composer.preview === "dm" ? (
            <div className="grid justify-items-center">
              <InstagramPreview
                screen="dm"
                account={{
                  username: active.username,
                  picture: active.profilePictureUrl,
                }}
                post={previewOf({
                  media: draft.media,
                  caption: captionFor(draft, active.id),
                })}
                keyword={keywordsOf(composer.keywords)[0] ?? null}
                commentReply={composer.response.commentReply}
                openingDm={composer.response.openingDm}
                dmMessage={composer.response.dmMessage}
                buttons={composer.response.dmButtons.map(
                  (button) => button.label
                )}
                productCarousel={
                  composer.response.dmFormat === "carousel"
                    ? (composer.response.productCarousel ?? null)
                    : null
                }
                followUp={composer.response.followUp ?? null}
              />
            </div>
          ) : (
            <PostPreview
              key={active.id}
              account={active}
              caption={captionFor(draft, active.id).trim()}
              media={draft.media}
              title={draft.youtube[active.id]?.title.trim() || null}
              kind={draft.kind}
            />
          )}
        </div>
      </aside>
      <ScheduleDialog
        open={scheduling}
        onOpenChange={setScheduling}
        formId={formId}
        accounts={accounts}
        busy={busy}
        saving={saving}
        onPreview={(accountId) => {
          selectChannel(accountId)
          setPreviewOpen(true)
          setMobilePreview(true)
          setScheduling(false)
        }}
      />
    </form>
  )
}

function ChannelMenu({
  accounts,
  selected,
  disabled,
  canConnect,
  onToggle,
  onConnect,
}: {
  accounts: Account[]
  selected: string[]
  disabled: boolean
  canConnect: (platform: Platform) => boolean
  onToggle: (id: string) => void
  onConnect: (platform: Platform) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Choose channels"
            title="Choose channels"
            disabled={disabled}
          />
        }
      >
        <Plus />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Publish to</DropdownMenuLabel>
          {accounts.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.id}
              checked={selected.includes(item.id)}
              disabled={item.status !== "connected"}
              onCheckedChange={() => onToggle(item.id)}
            >
              <Avatar
                src={item.profilePictureUrl}
                name={item.username}
                className="size-6"
              />
              <span className="min-w-0 flex-1 truncate">
                {accountLabel(item)}
              </span>
              <PlatformIcon
                platform={item.platform}
                className="size-3.5 text-muted-foreground"
              />
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!PLATFORMS.some(canConnect)}>
            <Plus />
            Connect a channel
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Opens in a new tab</DropdownMenuLabel>
              {PLATFORMS.filter(canConnect).map((platform) => (
                <DropdownMenuItem
                  key={platform}
                  onClick={() => onConnect(platform)}
                >
                  <PlatformIcon platform={platform} />
                  {PLATFORM_RULES[platform].name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  disabled?: boolean
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-0.5 justify-self-start rounded-lg bg-muted p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none",
            value === option.value &&
              "bg-card font-medium text-foreground shadow-xs dark:bg-accent"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
