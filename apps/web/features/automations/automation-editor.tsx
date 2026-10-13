"use client"

import { useEffect, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, X } from "lucide-react"
import {
  AUTOMATION_LIMITS,
  PERSONALIZATION_TOKENS,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  EmptyState,
  ErrorBanner,
  Field,
  Loading,
  Panel,
} from "@/components/interface"
import { Instagram } from "@/components/instagram-icon"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { FollowUpEditor, ProductCarouselEditor } from "./automation-extras"
import { LAST_STEP, useEditorStore } from "@/stores/editor-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

const KEYWORD_EXAMPLES = ["Price", "Link", "Shop"]

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
  const keywords = editor.keywordText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const show = (step: number) => editor.step >= step

  async function save(status: "active" | "paused") {
    if (await editor.save(status)) router.push("/automations")
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (editor.step < LAST_STEP) editor.next()
    else void save("active")
  }

  const preview = (
    <InstagramPreview
      screen={editor.preview}
      account={{
        username: account?.username ?? "",
        picture: account?.profilePictureUrl ?? null,
      }}
      post={
        draft.trigger.postScope === "specific_post"
          ? selectedPost
          : (editor.posts[0] ?? null)
      }
      keyword={editor.anyWord ? null : (keywords[0] ?? null)}
      commentReply={draft.commentReply}
      openingDm={draft.openingDm}
      dmMessage={draft.dmMessage}
      buttons={draft.dmButtons.map((item) => item.label)}
      productCarousel={draft.productCarousel ?? null}
      followUp={draft.followUp ?? null}
    />
  )

  return (
    <div className="flex min-h-0 flex-1">
      <Panel className="min-w-0 flex-1 xl:w-[560px] xl:flex-none">
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
                label="any post or reel"
                checked={draft.trigger.postScope === "any_post"}
                onSelect={() =>
                  editor.patch({ trigger: { postScope: "any_post" } })
                }
              />
            </Step>

            {show(1) && (
              <Step
                title="And this comment has"
                onFocus={() => useEditorStore.setState({ preview: "post" })}
              >
                <Option
                  name="words"
                  label="a specific word or words"
                  checked={!editor.anyWord}
                  onSelect={() => useEditorStore.setState({ anyWord: false })}
                >
                  <Field
                    error={fields.keywords ?? fields["keywords.0"]}
                    hint="Use commas to separate words"
                  >
                    <Input
                      autoFocus={!id}
                      placeholder="Enter a word or multiple"
                      value={editor.keywordText}
                      onChange={(event) =>
                        useEditorStore.setState({
                          keywordText: event.target.value,
                          fields: {},
                        })
                      }
                    />
                  </Field>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    For example:
                    {KEYWORD_EXAMPLES.map((word) => (
                      <button
                        key={word}
                        type="button"
                        className="rounded-full bg-card px-2 py-0.5 hover:text-foreground"
                        onClick={() =>
                          useEditorStore.setState({
                            keywordText: [...keywords, word].join(", "),
                          })
                        }
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </Option>
                <Option
                  name="words"
                  label="any word"
                  checked={editor.anyWord}
                  onSelect={() => useEditorStore.setState({ anyWord: true })}
                />
              </Step>
            )}

            {show(2) && (
              <Step
                title="They will get"
                onFocus={() => useEditorStore.setState({ preview: "dm" })}
              >
                <Card
                  title="an opening DM"
                  enabled={draft.openingDm !== null}
                  onToggle={(on) =>
                    editor.patch({
                      openingDm: on
                        ? { message: "", buttonLabel: "Send me the link" }
                        : null,
                    })
                  }
                >
                  {draft.openingDm && (
                    <>
                      <Field error={fields["openingDm.message"]}>
                        <Textarea
                          aria-label="Opening message"
                          placeholder="Thanks for the comment! Tap below and I'll send you the link."
                          maxLength={AUTOMATION_LIMITS.openingDmMaxLength}
                          value={draft.openingDm.message}
                          onChange={(event) =>
                            editor.patch({
                              openingDm: {
                                ...draft.openingDm!,
                                message: event.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field error={fields["openingDm.buttonLabel"]}>
                        <Input
                          aria-label="Opening button label"
                          maxLength={AUTOMATION_LIMITS.dmButtonLabelMaxLength}
                          value={draft.openingDm.buttonLabel}
                          onChange={(event) =>
                            editor.patch({
                              openingDm: {
                                ...draft.openingDm!,
                                buttonLabel: event.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                    </>
                  )}
                </Card>

                <ProductCarouselEditor />
                {!draft.productCarousel && (
                  <Card title="a DM with the link">
                    <Field error={fields.dmMessage}>
                      <Textarea
                        aria-label="Message"
                        placeholder="Here's your link!"
                        maxLength={AUTOMATION_LIMITS.dmMessageMaxLength}
                        value={draft.dmMessage}
                        onChange={(event) =>
                          editor.patch({ dmMessage: event.target.value })
                        }
                      />
                    </Field>
                    <div className="flex gap-1.5">
                      {PERSONALIZATION_TOKENS.map((item) => (
                        <button
                          key={item.token}
                          type="button"
                          className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            editor.patch({
                              dmMessage: `${draft.dmMessage}${item.token}`,
                            })
                          }
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>
                    {draft.dmButtons.map((button, index) => (
                      <div key={index} className="grid gap-1.5">
                        <div className="flex gap-1.5">
                          <Input
                            aria-label={`Link ${index + 1}`}
                            placeholder="https://"
                            inputMode="url"
                            value={button.url}
                            aria-invalid={!!fields[`dmButtons.${index}.url`]}
                            onChange={(event) =>
                              editor.patch({
                                dmButtons: draft.dmButtons.map((item, i) =>
                                  i === index
                                    ? { ...item, url: event.target.value }
                                    : item
                                ),
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove link ${index + 1}`}
                            onClick={() =>
                              editor.patch({
                                dmButtons: draft.dmButtons.filter(
                                  (_, i) => i !== index
                                ),
                              })
                            }
                          >
                            <X />
                          </Button>
                        </div>
                        <Input
                          aria-label={`Button label ${index + 1}`}
                          placeholder="Button label"
                          maxLength={AUTOMATION_LIMITS.dmButtonLabelMaxLength}
                          value={button.label}
                          aria-invalid={!!fields[`dmButtons.${index}.label`]}
                          onChange={(event) =>
                            editor.patch({
                              dmButtons: draft.dmButtons.map((item, i) =>
                                i === index
                                  ? { ...item, label: event.target.value }
                                  : item
                              ),
                            })
                          }
                        />
                        {(fields[`dmButtons.${index}.url`] ??
                          fields[`dmButtons.${index}.label`]) && (
                          <p className="text-xs text-destructive">
                            {fields[`dmButtons.${index}.url`] ??
                              fields[`dmButtons.${index}.label`]}
                          </p>
                        )}
                      </div>
                    ))}
                    {draft.dmButtons.length <
                      AUTOMATION_LIMITS.maxDmButtons && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={() =>
                          editor.patch({
                            dmButtons: [
                              ...draft.dmButtons,
                              { label: "", url: "" },
                            ],
                          })
                        }
                      >
                        <Plus />
                        Add link
                      </Button>
                    )}
                  </Card>
                )}
                <FollowUpEditor />

                <Card
                  title="a reply to their comment"
                  enabled={draft.commentReply !== null}
                  onToggle={(on) =>
                    editor.patch({ commentReply: on ? "" : null })
                  }
                  onFocus={() => useEditorStore.setState({ preview: "post" })}
                >
                  {draft.commentReply !== null && (
                    <Field error={fields.commentReply}>
                      <Input
                        aria-label="Public reply"
                        placeholder="Sent you a DM!"
                        maxLength={AUTOMATION_LIMITS.commentReplyMaxLength}
                        value={draft.commentReply}
                        onChange={(event) =>
                          editor.patch({ commentReply: event.target.value })
                        }
                      />
                    </Field>
                  )}
                </Card>

                <Card
                  title="the link only if they follow you"
                  enabled={draft.requireFollow}
                  onToggle={(on) => editor.patch({ requireFollow: on })}
                />
              </Step>
            )}
          </div>
          <footer className="flex shrink-0 items-center gap-2 px-10 pt-4 pb-8">
            <ErrorBanner message={editor.error} className="mr-auto py-1.5" />
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="xl:hidden"
                  />
                }
              >
                Preview
              </DialogTrigger>
              <DialogContent className="grid max-h-[90dvh] justify-items-center overflow-auto sm:max-w-sm">
                <DialogTitle>Instagram preview</DialogTitle>
                {preview}
              </DialogContent>
            </Dialog>
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
      <Panel className="hidden flex-1 items-center justify-center overflow-auto bg-muted p-10 xl:flex">
        {preview}
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
        retry={() => void editor.selectAccount(editor.draft.instagramAccountId)}
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

function Step({
  title,
  onFocus,
  children,
}: {
  title: string
  onFocus: () => void
  children: React.ReactNode
}) {
  return (
    <section
      className="grid gap-3"
      onFocusCapture={onFocus}
      onPointerDownCapture={onFocus}
    >
      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Option({
  name,
  label,
  checked,
  onSelect,
  children,
}: {
  name: string
  label: string
  checked: boolean
  onSelect: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-md bg-muted p-4 [&_input]:bg-card">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onSelect}
          className="size-4 accent-foreground"
        />
        {label}
      </label>
      {checked && children && <div className="mt-3">{children}</div>}
    </div>
  )
}

function Card({
  title,
  enabled,
  onToggle,
  onFocus,
  children,
}: {
  title: string
  enabled?: boolean
  onToggle?: (on: boolean) => void
  onFocus?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      className="grid gap-3 rounded-md bg-muted p-4 [&_input]:bg-card [&_textarea]:bg-card"
      onFocusCapture={onFocus}
      onPointerDownCapture={onFocus}
    >
      <div className="flex items-center justify-between text-sm">
        {title}
        {onToggle && (
          <Switch
            checked={enabled}
            aria-label={title}
            onCheckedChange={(checked) => onToggle(checked)}
          />
        )}
      </div>
      {children}
    </div>
  )
}
