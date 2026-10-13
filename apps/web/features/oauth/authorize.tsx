"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authorizeLoginPath } from "@workspace/api/contract"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Brand } from "@/components/brand"
import { ErrorBanner, Loading } from "@/components/interface"
import { useAuthStore } from "@/stores/auth-store"
import { useAuthorizeStore } from "@/stores/authorize-store"
import { usePendingConnectionStore } from "@/stores/pending-connection-store"

function Heading({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

/** Where an agent app such as Claude sends the owner to approve connecting. */
export function Authorize({ requestId }: { requestId: string | null }) {
  const auth = useAuthStore()
  const consent = useAuthorizeStore()
  const rememberRequest = usePendingConnectionStore((state) => state.remember)
  const router = useRouter()
  useEffect(() => {
    if (requestId && auth.status === "idle") void auth.load()
  }, [requestId, auth.status, auth.load])
  useEffect(() => {
    if (!requestId) return
    if (auth.status === "signed_out")
      router.replace(authorizeLoginPath(requestId))
    if (auth.status === "signed_in") void consent.load(requestId)
    // Returning from billing or opening another request reloads consent.
    return consent.reset
  }, [requestId, auth.status, consent.load, consent.reset, router])

  const request = consent.request
  let content: React.ReactNode = <Loading />
  if (!requestId)
    content = (
      <Heading title="This link is not valid">
        Start connecting again from your app.
      </Heading>
    )
  else if (auth.status === "error")
    content = (
      <ErrorBanner message={auth.error} retry={() => void auth.load()} />
    )
  else if (consent.planRequired)
    content = (
      <>
        <Heading title="Choose a plan first">
          Apps can connect to aghost once your workspace has a plan. You will
          come back here after choosing one.
        </Heading>
        <ErrorBanner message={consent.error} />
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={consent.busy}
            onClick={() => void consent.decide(requestId, false)}
          >
            Cancel
          </Button>
          {/* The dashboard brings the owner back here once the plan is active. */}
          <Link
            href="/settings#billing"
            onClick={() => rememberRequest(requestId)}
            className={buttonVariants()}
          >
            Choose a plan
          </Link>
        </div>
      </>
    )
  else if (consent.status === "error")
    content = (
      <>
        <ErrorBanner message={consent.error} />
        <Link href="/home" className={buttonVariants({ variant: "secondary" })}>
          Back to aghost
        </Link>
      </>
    )
  else if (consent.status === "ready" && request)
    content = (
      <>
        <Heading title={`Connect ${request.clientName}`}>
          {request.clientName} will be able to manage your automations, read
          your Instagram accounts, contacts and inbox, and send messages for
          you.
        </Heading>
        {request.local && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            This app runs on your computer. Allow it only if you just started
            connecting from it.
          </p>
        )}
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Account</dt>
          <dd className="truncate">{auth.user?.email}</dd>
          <dt className="text-muted-foreground">Returns to</dt>
          <dd className="truncate">{request.destination}</dd>
        </dl>
        <ErrorBanner message={consent.error} />
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={consent.busy}
            onClick={() => void consent.decide(request.id, false)}
          >
            Cancel
          </Button>
          <Button
            disabled={consent.busy}
            onClick={() => void consent.decide(request.id, true)}
          >
            Allow
          </Button>
        </div>
      </>
    )

  return (
    <main className="grid min-h-dvh place-items-center bg-muted p-4">
      <section className="grid w-full max-w-md gap-6 bg-card p-6 sm:p-8">
        <Brand href="/home" />
        {content}
      </section>
    </main>
  )
}
