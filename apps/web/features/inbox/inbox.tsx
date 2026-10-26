"use client"

import { useEffect, type FormEvent } from "react"
import Image from "next/image"
import { ArrowUp, ExternalLink, Inbox as InboxIcon } from "lucide-react"
import { INBOX_LIMITS } from "@workspace/api/contract"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  Loading,
  Panel,
  PanelHeader,
  SearchInput,
} from "@/components/interface"
import { timeAgo } from "@/lib/format"
import { useInboxStore } from "@/stores/inbox-store"
import { accountsIn, useActiveSet } from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

export function Inbox() {
  const inbox = useInboxStore()
  const load = inbox.load
  useEffect(() => {
    void load()
  }, [load])
  const accounts = accountsIn(
    useWorkspaceStore((state) => state.accounts),
    useActiveSet()
  )
  // Conversations of the set being shown, on its Instagram accounts.
  const inSet = inbox.conversations.filter((item) =>
    accounts.some((account) => account.id === item.instagramAccountId)
  )
  const query = inbox.query.trim().toLowerCase()
  const conversations = inSet.filter((item) =>
    (item.participant.name ?? "").toLowerCase().includes(query)
  )
  return (
    <div className="flex min-h-0 flex-1">
      <Panel className="w-80 shrink-0 border-r">
        <PanelHeader title="Inbox" />
        <div className="px-4">
          <SearchInput
            label="Search conversations"
            value={inbox.query}
            onChange={(query) => useInboxStore.setState({ query })}
          />
        </div>
        <ErrorBanner
          message={inbox.error}
          retry={() => void inbox.load()}
          className="m-3 mb-0"
        />
        {inbox.status === "loading" || inbox.status === "idle" ? (
          <Loading />
        ) : (
          // ph-no-capture keeps Instagram users' messages and names out of
          // session replays and autocaptured clicks.
          <div className="ph-no-capture grid min-h-0 flex-1 content-start gap-0.5 overflow-auto p-3">
            {conversations.length === 0 && inbox.status === "ready" && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {inSet.length ? "No matches" : "No messages yet"}
              </p>
            )}
            {conversations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void inbox.open(item)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  inbox.selected?.id === item.id && "bg-muted"
                )}
              >
                <Avatar
                  src={item.participant.avatarUrl}
                  name={item.participant.name}
                  className="size-9"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-sm font-medium">
                      {item.participant.name ?? "Instagram user"}
                    </p>
                    {item.updatedAt && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {timeAgo(item.updatedAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {item.lastMessage ?? " "}
                    </p>
                    {!!item.unreadCount && (
                      <span className="ml-auto grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>
      <Panel className="flex-1">
        {inbox.selected ? (
          <Thread />
        ) : (
          <EmptyState icon={<InboxIcon />} title="Select a conversation" />
        )}
      </Panel>
    </div>
  )
}

function Thread() {
  const inbox = useInboxStore()
  const conversation = inbox.selected!
  function submit(event: FormEvent) {
    event.preventDefault()
    void inbox.send()
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
      {inbox.messagesLoading ? (
        <Loading />
      ) : (
        // Reversed, so the newest message sits at the bottom without scrolling.
        <div className="ph-no-capture flex min-h-0 flex-1 flex-col-reverse gap-1.5 overflow-auto px-6 py-4">
          {[...inbox.messages].reverse().map((message) => (
            <div
              key={message.id}
              title={new Date(message.createdAt).toLocaleString()}
              className={cn(
                "grid max-w-[70%] gap-1.5",
                message.direction === "outgoing" && "justify-items-end self-end"
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
        <ErrorBanner message={inbox.messagesError} />
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Message"
            placeholder="Message"
            rows={1}
            maxLength={INBOX_LIMITS.messageMaxLength}
            className="max-h-40 min-h-9"
            value={inbox.draft}
            onChange={(event) =>
              useInboxStore.setState({ draft: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) submit(event)
            }}
          />
          <Button
            type="submit"
            size="icon-lg"
            aria-label="Send"
            disabled={inbox.sending || !inbox.draft.trim()}
          >
            <ArrowUp />
          </Button>
        </div>
      </form>
    </>
  )
}
