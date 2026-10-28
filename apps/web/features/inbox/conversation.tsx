"use client"

import type { FormEvent } from "react"
import Image from "next/image"
import { ArrowUp, ExternalLink } from "lucide-react"
import {
  INBOX_LIMITS,
  type Conversation,
  type Message,
} from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { Avatar, ErrorBanner, Loading } from "@/components/interface"
import { timeAgo } from "@/lib/format"

/** A conversation in the list: who, when, and the last message. */
export function ConversationButton({
  conversation,
  selected,
  onOpen,
}: {
  conversation: Conversation
  selected: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted",
        selected && "bg-muted"
      )}
    >
      <Avatar
        src={conversation.participant.avatarUrl}
        name={conversation.participant.name}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium">
            {conversation.participant.name ?? "Instagram user"}
          </p>
          {conversation.updatedAt && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {timeAgo(conversation.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {conversation.lastMessage ?? " "}
          </p>
          {!!conversation.unreadCount && (
            <span className="ml-auto grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/** An open conversation's messages and a box to reply. */
export function Thread({
  conversation,
  messages,
  loading,
  error,
  draft,
  onDraft,
  sending,
  onSend,
}: {
  conversation: Conversation
  messages: Message[]
  loading: boolean
  error: string | null
  draft: string
  onDraft: (draft: string) => void
  sending: boolean
  onSend: () => void
}) {
  function submit(event: FormEvent) {
    event.preventDefault()
    onSend()
  }
  return (
    <>
      <header className="ph-no-capture box-content flex h-9 shrink-0 items-center gap-3 px-6 pt-10 pb-4">
        <Avatar
          src={conversation.participant.avatarUrl}
          name={conversation.participant.name}
        />
        <p className="mr-auto truncate text-sm font-semibold">
          {conversation.participant.name ?? "Instagram user"}
        </p>
        {conversation.url && (
          <a
            href={conversation.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in Instagram"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ExternalLink />
          </a>
        )}
      </header>
      {loading ? (
        <Loading />
      ) : (
        // Reversed, so the newest message sits at the bottom without scrolling.
        <div className="ph-no-capture flex min-h-0 flex-1 flex-col-reverse gap-1.5 overflow-auto px-6 py-4">
          {[...messages].reverse().map((message) => (
            <div
              key={message.id}
              title={new Date(message.createdAt).toLocaleString()}
              className={cn(
                "grid max-w-[70%] gap-1.5",
                message.direction === "outgoing"
                  ? "justify-items-end self-end"
                  : "justify-items-start self-start"
              )}
            >
              {message.attachments.map((attachment, index) =>
                attachment.url && attachment.type === "image" ? (
                  <span
                    key={index}
                    className="relative size-48 overflow-hidden rounded-2xl bg-muted"
                  >
                    <Image
                      src={attachment.url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span
                    key={index}
                    className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
                  >
                    {attachment.type}
                  </span>
                )
              )}
              {message.text && (
                <p
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-line",
                    message.direction === "outgoing"
                      ? "bg-foreground text-background"
                      : "bg-muted"
                  )}
                >
                  {message.text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="grid gap-2 px-6 pt-2 pb-5">
        <ErrorBanner message={error} />
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Message"
            placeholder="Message"
            rows={1}
            maxLength={INBOX_LIMITS.messageMaxLength}
            className="max-h-40 min-h-9"
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) submit(event)
            }}
          />
          <Button
            type="submit"
            size="icon-lg"
            aria-label="Send"
            disabled={sending || !draft.trim()}
          >
            <ArrowUp />
          </Button>
        </div>
      </form>
    </>
  )
}
