import Link from "next/link"
import { buttonVariants } from "@workspace/ui/components/button"
import { Brand } from "@/components/brand"
import { InstagramPreview } from "@/features/automations/instagram-preview"

export function Landing() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6">
      <header className="flex h-16 items-center gap-2">
        <Brand />
        <Link
          href="/pricing"
          className={buttonVariants({ variant: "ghost", className: "ml-auto" })}
        >
          Pricing
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          Log in
        </Link>
        <Link href="/login" className={buttonVariants()}>
          Get started
        </Link>
      </header>
      <main className="grid flex-1 items-center gap-12 py-12 md:grid-cols-[1fr_auto]">
        <div className="grid max-w-md gap-5">
          <p className="text-sm font-medium">MCP + REST API, built in</p>
          <h1 className="text-5xl font-semibold tracking-tight">
            Instagram automation, built for agents.
          </h1>
          <p className="text-lg text-muted-foreground">
            Let your AI agent create, manage and monitor comment-to-DM
            automations. Connect through MCP or build your own workflows with
            the REST API.
          </p>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="grid gap-1">
              <dt className="font-semibold">MCP for your AI agent</dt>
              <dd className="text-muted-foreground">
                Connect Claude Code, Codex or Cursor.
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="font-semibold">REST API for your workflows</dt>
              <dd className="text-muted-foreground">
                Create automations and read results from your own apps.
              </dd>
            </div>
          </dl>
          <Link
            href="/login"
            className={buttonVariants({
              size: "lg",
              className: "justify-self-start",
            })}
          >
            Get started
          </Link>
        </div>
        <InstagramPreview
          screen="dm"
          account={{ username: "studio.maya", picture: null }}
          post={null}
          keyword="GUIDE"
          commentReply={null}
          openingDm={{
            message: "Hey {{first_name}}! Thanks for the comment 💬",
            buttonLabel: "Send me the guide",
          }}
          dmMessage="Here's your free guide ✨"
          buttons={["Download"]}
        />
      </main>
    </div>
  )
}
