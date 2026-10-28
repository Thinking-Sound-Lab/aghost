import Link from "next/link"
import { Google } from "@/components/google-icon"
import { ErrorBanner } from "@/components/interface"
import { cn } from "@workspace/ui/lib/utils"
import {
  ClaudeCodeApp,
  CodexApp,
  CursorApp,
} from "@/features/marketing/agent-apps"
import { Brand } from "@/features/marketing/header"
import {
  Screen,
  buttonsScene,
  tapScene,
} from "@/features/marketing/illustrations"
import {
  ComposerCard,
  PreviewCard,
  ScheduleCard,
} from "@/features/marketing/product-cards"
import { MarketingCanvas, Painting, textLink } from "@/features/marketing/shell"
import { api } from "@/lib/api"

/** One column of the wall: its items twice over, so the loop has no seam. */
function WallColumn({
  items,
  reverse = false,
}: {
  items: React.ReactNode[]
  reverse?: boolean
}) {
  return (
    <div className="min-h-0 overflow-hidden">
      <div
        className={cn(
          "marketing-scroll grid",
          reverse && "marketing-scroll-reverse"
        )}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="grid gap-4 pb-4">
            {items}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Posts going everywhere and agents at work, in two columns scrolling
 * opposite ways, faded at both ends.
 */
function ProductWall() {
  return (
    <div
      aria-hidden="true"
      className="grid min-h-0 flex-1 grid-cols-2 gap-4 [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_80%,transparent)] px-10"
    >
      <WallColumn
        items={[
          <ClaudeCodeApp key="claude" />,
          <ComposerCard key="composer" />,
          <Screen key="tap" className="bg-[#1a1a1a]">
            {tapScene}
          </Screen>,
          <ScheduleCard key="schedule" />,
        ]}
      />
      <WallColumn
        reverse
        items={[
          <PreviewCard key="preview" />,
          <CodexApp key="codex" />,
          <Screen key="buttons" className="bg-[#1a1a1a]">
            {buttonsScene}
          </Screen>,
          <CursorApp key="cursor" />,
        ]}
      />
    </div>
  )
}

export function SignIn({
  error,
  returnTo,
}: {
  error: string | null
  /** The page that sent the person here, which the API returns them to. */
  returnTo: Record<string, string> | null
}) {
  return (
    <MarketingCanvas className="flex p-3">
      <main className="grid w-full gap-3 lg:h-[calc(100svh-1.5rem)] lg:grid-cols-[minmax(0,36rem)_1fr]">
        <section
          aria-labelledby="sign-in-heading"
          className="flex min-h-[calc(100svh-1.5rem)] items-center border border-ink/10 bg-white/60 px-8 py-12 sm:px-16 lg:min-h-0"
        >
          <div className="mx-auto w-full max-w-md">
            <Brand />
            <h1
              id="sign-in-heading"
              className="mt-10 text-4xl font-medium tracking-[-0.045em] sm:text-5xl"
            >
              Log in or sign up
            </h1>
            <p className="mt-8 text-ink/70">Continue with</p>
            <ErrorBanner message={error} className="mt-3" />
            {/* A full navigation: the API sends the browser to Google and back. */}
            <a
              href={`${api.auth.googleSignInUrl}${returnTo ? `?${new URLSearchParams(returnTo)}` : ""}`}
              className="mt-3 flex h-13 items-center justify-center gap-3 border border-ink/15 bg-white px-6 text-base font-medium text-ink transition-colors outline-none hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <Google size={21} />
              Google
            </a>
            <p className="mt-6 text-sm leading-relaxed text-ink/55">
              By continuing, you agree to the{" "}
              <Link href="/terms-of-service" className={textLink}>
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link href="/privacy-policy" className={textLink}>
                Privacy Policy
              </Link>
              .
            </p>
            <p className="mt-10 text-sm text-ink/65">
              Need a hand?{" "}
              <Link href="/contact" className={textLink}>
                Contact us
              </Link>
            </p>
          </div>
        </section>
        <Painting
          tone="sky"
          className="hidden min-h-0 flex-col pt-20 text-ink lg:flex"
        >
          <section
            aria-labelledby="sign-in-wall-heading"
            className="flex min-h-0 flex-1 flex-col"
          >
            <h2
              id="sign-in-wall-heading"
              className="mx-auto mb-10 max-w-3xl px-6 text-center text-4xl font-medium tracking-[-0.045em] text-balance xl:text-5xl"
            >
              Post everywhere. Answer every comment.
            </h2>
            <ProductWall />
          </section>
        </Painting>
      </main>
    </MarketingCanvas>
  )
}
