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
          href="/login"
          className={buttonVariants({ variant: "ghost", className: "ml-auto" })}
        >
          Log in
        </Link>
        <Link href="/signup" className={buttonVariants()}>
          Get started
        </Link>
      </header>
      <main className="grid flex-1 items-center gap-12 py-12 md:grid-cols-[1fr_auto]">
        <div className="grid max-w-md gap-5">
          <h1 className="text-5xl font-semibold tracking-tight">
            Turn comments into conversations.
          </h1>
          <p className="text-lg text-muted-foreground">
            Someone comments a keyword on your post. They get your link in a DM,
            automatically.
          </p>
          <Link
            href="/signup"
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
