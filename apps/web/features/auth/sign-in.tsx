import Link from "next/link"
import { Check, Terminal } from "lucide-react"
import { Mascot } from "@/components/brand"
import { Google } from "@/components/google-icon"
import { ErrorBanner } from "@/components/interface"
import {
  NotebookBrand,
  NotebookCanvas,
  marketingLink,
} from "@/features/marketing/shell"
import { api } from "@/lib/api"
import type { ChoosePlanInput } from "@workspace/api/contract"
import "./sign-in.css"

function AgentPreview() {
  return (
    <figure className="notebook-sign-in-preview">
      <div className="notebook-sign-in-papers" aria-hidden="true">
        <div className="notebook-sign-in-agent-paper">
          <div className="notebook-sign-in-agent-header">
            <Terminal size={17} />
            <span>Your agent</span>
          </div>
          <div className="notebook-sign-in-prompt">
            <span>You</span>
            <p>
              Create a paused GUIDE automation for my latest Instagram reel.
            </p>
          </div>
          <div className="notebook-sign-in-agent-result">
            <Check size={17} />
            <p>
              Automation created.
              <span>Paused, as requested.</span>
            </p>
          </div>
        </div>
        <div className="notebook-sign-in-dm-paper">
          <div className="notebook-sign-in-dm-header">
            <Mascot size={23} eager />
            <span>DM preview</span>
          </div>
          <p>Here’s the guide you asked for ✨</p>
          <div className="notebook-sign-in-dm-link">Get the guide ↗</div>
        </div>
      </div>
      <figcaption>
        <span className="notebook-hand">
          One prompt. A little less busywork.
        </span>
        <span className="notebook-sign-in-example">Example agent workflow</span>
      </figcaption>
    </figure>
  )
}

export function SignIn({
  error,
  billing = false,
  choice = null,
}: {
  error: string | null
  billing?: boolean
  choice?: ChoosePlanInput | null
}) {
  return (
    <NotebookCanvas className="notebook-sign-in">
      <div className="notebook-page notebook-sign-in-page">
        <header className="notebook-sign-in-toolbar">
          <NotebookBrand />
          <Link href="/" className={marketingLink}>
            Back to home
          </Link>
        </header>
        <main className="notebook-sign-in-layout">
          <section
            className="notebook-sign-in-panel"
            aria-labelledby="sign-in-heading"
          >
            <div className="notebook-sign-in-form">
              <h1 id="sign-in-heading">Log in or sign up</h1>
              <p className="notebook-sign-in-description">
                Your workspace starts here.
              </p>
              <ErrorBanner message={error} className="notebook-sign-in-error" />
              {/* A full navigation: the API sends the browser to Google and back. */}
              <a
                href={`${api.auth.googleSignInUrl}${billing ? `?${new URLSearchParams({ next: "billing", ...choice })}` : ""}`}
                className="notebook-sign-in-google"
              >
                <Google size={21} />
                Continue with Google
              </a>
              <p className="notebook-sign-in-legal">
                By continuing, you agree to the{" "}
                <Link href="/terms-of-service" className={marketingLink}>
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/privacy-policy" className={marketingLink}>
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>
          <section
            className="notebook-sign-in-story"
            aria-labelledby="sign-in-agent-heading"
          >
            <div className="notebook-sign-in-story-content">
              <h2 id="sign-in-agent-heading" className="notebook-title">
                Your agent.
                <br />
                Your Instagram.
              </h2>
              <p className="notebook-sign-in-story-description">
                Let Claude Code, Codex, or Cursor run your Instagram DMs. You
                set the direction. Your agent handles the setup.
              </p>
              <AgentPreview />
            </div>
          </section>
        </main>
        <footer className="notebook-sign-in-footer">
          <span>© 2026 aghost</span>
          <Link href="/contact" className={marketingLink}>
            Need a hand? Contact us
          </Link>
        </footer>
      </div>
    </NotebookCanvas>
  )
}
