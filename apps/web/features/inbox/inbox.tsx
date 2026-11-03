"use client"

import { useEffect } from "react"
import { Inbox as InboxIcon } from "lucide-react"
import {
  EmptyState,
  ErrorBanner,
  Loading,
  Panel,
  PanelHeader,
  SearchInput,
} from "@/components/interface"
import { useInboxStore } from "@/stores/inbox-store"
import { accountsIn, useActiveSet } from "@/stores/social-set-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { ConversationButton, Thread } from "./conversation"

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
  // A conversation of another set must not stay open to reply from.
  const close = inbox.close
  const foreign =
    inbox.selected !== null &&
    !accounts.some(
      (account) => account.id === inbox.selected?.instagramAccountId
    )
  useEffect(() => {
    if (foreign) close()
  }, [foreign, close])
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
          <div className="ph-no-capture grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-0.5 overflow-auto p-3">
            {conversations.length === 0 && inbox.status === "ready" && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {inSet.length ? "No matches" : "No messages yet"}
              </p>
            )}
            {conversations.map((item) => (
              <ConversationButton
                key={item.id}
                conversation={item}
                selected={inbox.selected?.id === item.id}
                onOpen={() => void inbox.open(item)}
              />
            ))}
          </div>
        )}
      </Panel>
      <Panel className="flex-1">
        {inbox.selected && !foreign ? (
          <OpenThread />
        ) : (
          <EmptyState icon={<InboxIcon />} title="Select a conversation" />
        )}
      </Panel>
    </div>
  )
}

function OpenThread() {
  const inbox = useInboxStore()
  return (
    <Thread
      conversation={inbox.selected!}
      messages={inbox.messages}
      loading={inbox.messagesLoading}
      error={inbox.messagesError}
      draft={inbox.draft}
      onDraft={(draft) => useInboxStore.setState({ draft })}
      sending={inbox.sending}
      onSend={() => void inbox.send()}
    />
  )
}
