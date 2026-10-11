"use client"

import { useEffect, type FormEvent } from "react"
import { UsersRound } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  Loading,
  Page,
  SearchInput,
} from "@/components/interface"
import { timeAgo } from "@/lib/format"
import { useContactsStore } from "@/stores/contacts-store"

export function Contacts() {
  const store = useContactsStore()
  const load = store.load
  useEffect(() => {
    void load()
  }, [load])
  function search(event: FormEvent) {
    event.preventDefault()
    void store.load()
  }
  return (
    <Page
      title="Contacts"
      actions={
        <>
          {store.status === "ready" && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {store.total.toLocaleString()}
            </span>
          )}
          <form onSubmit={search} role="search">
            <SearchInput
              label="Search contacts"
              className="w-56"
              value={store.query}
              onChange={(query) => useContactsStore.setState({ query })}
            />
          </form>
        </>
      }
    >
      <ErrorBanner message={store.error} retry={() => void store.load()} />
      {store.status === "loading" || store.status === "idle" ? (
        <Loading />
      ) : store.contacts.length === 0 ? (
        store.status === "ready" && (
          <EmptyState
            icon={<UsersRound />}
            title={store.query ? "No matches" : "No contacts yet"}
          />
        )
      ) : (
        <>
          <div className="ph-no-capture divide-y">
            <div className="-mx-3 flex items-center gap-4 px-3 pb-2 text-xs text-muted-foreground">
              <span className="flex-1">Name</span>
              <span className="hidden w-48 md:block">Tags</span>
              <span className="w-24 text-right">Last message</span>
            </div>
            {store.contacts.map((contact) => (
              <div
                key={contact.id}
                className="-mx-3 flex items-center gap-4 px-3 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar
                    src={contact.avatarUrl}
                    name={contact.name ?? contact.username}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {contact.name ?? contact.username ?? "Instagram user"}
                    </p>
                    {contact.username && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{contact.username}
                      </p>
                    )}
                  </div>
                </div>
                <div className="hidden w-48 flex-wrap gap-1 md:flex">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {contact.lastMessageAt ? timeAgo(contact.lastMessageAt) : "—"}
                </span>
              </div>
            ))}
          </div>
          {store.hasMore && (
            <Button
              variant="secondary"
              className="justify-self-center"
              disabled={store.loadingMore}
              onClick={() => void store.more()}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </Page>
  )
}
