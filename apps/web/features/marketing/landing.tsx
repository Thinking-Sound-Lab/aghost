import Link from "next/link"
import { ArrowUpRight, Check, Plus } from "lucide-react"
import { Mascot } from "@/components/brand"
import { site } from "@/lib/site"
import { agentAbilities, faqs, facts, steps } from "./content"
import { agentLinks } from "./navigation"
import { Demo } from "./demo"
import { FeatureBoard } from "./feature-board"
import { AgentScene, InboxScene, StatsScene } from "./illustrations"
import {
  MarketingCta,
  MarketingPage,
  marketingButton,
  marketingLink,
} from "./shell"

function GetStarted() {
  return (
    <Link href="/login" className={marketingButton}>
      <span className="notebook-button-icon">
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </span>
      Get started
    </Link>
  )
}

export function Landing() {
  return (
    <MarketingPage>
      <section className="notebook-hero" aria-label="Instagram DM automation">
        <span className="notebook-sticker notebook-sticker-mint notebook-hero-sticker">
          Made for creators
        </span>
        <span className="notebook-sticker notebook-hero-sticker notebook-hero-sticker-right">
          Built for AI agents
        </span>
        <p className="notebook-hand notebook-hero-note">
          Meet your new Instagram sidekick.
        </p>
        <h1 className="notebook-title notebook-wordmark">
          aghost<span className="sr-only"> — Instagram DM automation</span>
        </h1>
        <div className="notebook-hero-examples" aria-hidden="true">
          <div className="notebook-hero-slip notebook-comment-slip">
            <div className="notebook-slip-person">
              <span className="notebook-slip-avatar">J</span>jules.creates{" "}
              <span className="ml-auto">♡</span>
            </div>
            <p className="notebook-slip-comment">
              This is so good!
              <br />
              GUIDE please 🙌
            </p>
            <p className="notebook-hand notebook-slip-caption">
              It starts with a comment.
            </p>
          </div>
          <div className="notebook-hero-slip notebook-dm-slip">
            <div className="notebook-slip-person">
              <Mascot size={23} />
              aghost <span className="ml-auto">↗</span>
            </div>
            <p className="notebook-dm-bubble">
              Hey Jules! Here’s the guide you asked for ✨
            </p>
            <p className="notebook-dm-link">Get the guide ↗</p>
            <p className="notebook-hand notebook-slip-caption">
              And lands in their inbox.
            </p>
          </div>
        </div>
        <Mascot size={65} className="notebook-hero-ghost" />
        <p className="notebook-hand notebook-hero-doodle" aria-hidden="true">
          the helpful kind of ghost ↖
        </p>
        <p className="notebook-hero-headline">
          You make the content.
          <br />
          We’ll handle the DMs.
        </p>
        <p className="notebook-hero-description">
          Turn Instagram comments into personal DMs with the right link. Set it
          up yourself, or let Claude Code, Codex, or Cursor do it with you.
        </p>
        <div className="notebook-hero-actions">
          <GetStarted />
          <a href="#demo" className="notebook-button notebook-button-quiet">
            See it in action{" "}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <p className="notebook-hero-footnote">
          Instagram professional account required ·{" "}
          <Link href="/pricing" className={marketingLink}>
            View plans and pricing
          </Link>
        </p>
      </section>
      <section className="notebook-intro" id="about">
        <div className="notebook-section notebook-intro-layout">
          <div>
            <p className="notebook-hand notebook-section-kicker">
              A little less busywork.
            </p>
            <h2 className="notebook-title">
              Good content
              <br />
              deserves a reply.
            </h2>
            <p className="notebook-body mt-5">
              For the guide you made, the product you love, and the next person
              asking for a link.
            </p>
            <Link
              href="/about"
              className={`${marketingLink} mt-5 inline-block text-xs`}
            >
              A little about aghost
            </Link>
          </div>
          <div className="notebook-intro-copy notebook-hand">
            <p>
              You’ve already done the hard part.
              <br />
              You made something worth sharing.
            </p>
            <p>
              Let your little ghost turn “send me the link” into an actual
              conversation. No more sending the same DM all afternoon.
            </p>
            <div className="notebook-stickers">
              <span className="notebook-sticker">Comment → DM</span>
              <span className="notebook-sticker notebook-sticker-mint">
                Followers first
              </span>
              <span className="notebook-sticker notebook-sticker-blue">
                Agent friendly
              </span>
            </div>
          </div>
        </div>
      </section>
      <Demo cta={<GetStarted />} />
      <section className="notebook-section" id="features">
        <div className="notebook-section-head">
          <div>
            <p className="notebook-hand notebook-section-kicker">
              A few things your ghost can do.
            </p>
            <h2 className="notebook-title notebook-section-heading">
              The good stuff.
            </h2>
          </div>
          <p className="notebook-body">
            Choose your trigger. Write your message. Make every interested
            comment a useful next step.
          </p>
        </div>
        <FeatureBoard />
        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="notebook-button notebook-button-quiet"
          >
            Explore all features{" "}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
      <section className="notebook-agent-block" id="agents">
        <div className="notebook-section notebook-agent-layout">
          <div>
            <p className="notebook-hand notebook-section-kicker">
              Yep, your agent can do this.
            </p>
            <h2 className="notebook-title notebook-section-heading">
              Your agent.
              <br />
              Our tools.
            </h2>
            <p>
              Give your AI agent access to aghost over MCP or the REST API. Tell
              it what you want, then review the automation in your dashboard.
            </p>
            <ul className="notebook-agent-list">
              {agentAbilities.map((ability) => (
                <li key={ability}>
                  <Check aria-hidden="true" className="size-3.5" />
                  {ability}
                </li>
              ))}
            </ul>
            <Link href="/agents" className={marketingButton}>
              Connect your agent{" "}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <nav
              aria-label="Agent integrations"
              className="notebook-stickers mt-7"
            >
              {agentLinks.slice(0, 3).map((agent, index) => (
                <Link
                  key={agent.href}
                  href={agent.href}
                  className={`notebook-sticker ${index === 1 ? "notebook-sticker-mint" : index === 2 ? "notebook-sticker-pink" : ""}`}
                >
                  {agent.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="notebook-agent-picture">
            <div className="notebook-illustration">
              <AgentScene endpoint={`${site.url}/api/mcp`} />
            </div>
            <p className="notebook-hand">One prompt. A lot less clicking.</p>
          </div>
        </div>
      </section>
      <section className="notebook-section" id="how-it-works">
        <div className="notebook-section-head">
          <div>
            <p className="notebook-hand notebook-section-kicker">
              Here’s how we get along.
            </p>
            <h2 className="notebook-title notebook-section-heading">
              Three little steps.
            </h2>
          </div>
          <p className="notebook-body">
            Your dashboard is always there. Bring an agent if you want a hand.
          </p>
        </div>
        <ol className="notebook-steps">
          {steps.map((step, index) => (
            <li key={step.title} className="notebook-step">
              <span className="notebook-hand notebook-step-number">
                Step {index + 1}
              </span>
              <h3 className="notebook-title">{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="notebook-section border-t border-black/20">
        <div className="notebook-section-head">
          <div>
            <p className="notebook-hand notebook-section-kicker">
              You’re still in the loop.
            </p>
            <h2 className="notebook-title notebook-section-heading">
              See the whole story.
            </h2>
          </div>
          <p className="notebook-body">
            Replies, clicks, and real conversations. Keep an eye on what happens
            after the comment.
          </p>
        </div>
        <div className="notebook-insights">
          <div>
            <div className="notebook-preview-frame">
              <StatsScene />
              <p className="notebook-hand">Example automation stats</p>
            </div>
            <h3 className="notebook-title">Know what got the click.</h3>
            <p>
              See comments, DMs sent, and link clicks for each automation. Check
              its activity log for sent, waiting, and failed messages.
            </p>
          </div>
          <div>
            <div
              className="notebook-preview-frame"
              style={{ transform: "rotate(1deg)" }}
            >
              <InboxScene />
              <p className="notebook-hand">Example inbox view</p>
            </div>
            <h3 className="notebook-title">Keep the conversation going.</h3>
            <p>
              Read and answer Instagram DMs in one inbox. Find your contacts,
              search a conversation, and pick up where the automation leaves
              off.
            </p>
          </div>
        </div>
        <dl className="notebook-facts">
          {facts.map((fact) => (
            <div className="notebook-fact" key={fact.label}>
              <dd className="notebook-title">{fact.value}</dd>
              <dt>{fact.label}</dt>
            </div>
          ))}
        </dl>
      </section>
      <section className="notebook-section notebook-faq" id="faq">
        <p className="notebook-hand notebook-section-kicker">
          Before you ask...
        </p>
        <h2 className="notebook-title notebook-section-heading">
          A few good questions.
        </h2>
        <div className="notebook-faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                <h3>{faq.question}</h3>
                <Plus className="size-4" aria-hidden="true" />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <MarketingCta />
    </MarketingPage>
  )
}
