import type { ComponentProps } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { AgentSession } from "./illustrations"

type Preview = Omit<ComponentProps<typeof InstagramPreview>, "account">

const account = { username: "aghost", picture: "/mascot.png" }

// Each example is a radio button, and CSS shows the picture for the checked
// one, so the section needs no client JavaScript. The `show` classes are
// written out in full because Tailwind only generates classes it finds in the
// source. An example without a phone preview shows the agent at work.
const examples: {
  id: string
  show: string
  title: string
  text: string
  preview: Preview | null
}[] = [
  {
    id: "demo-agent",
    show: "group-has-[#demo-agent:checked]:block",
    title: "Ask your agent",
    text: "Say what you want. Your AI agent builds it.",
    preview: null,
  },
  {
    id: "demo-reply",
    show: "group-has-[#demo-reply:checked]:block",
    title: "Reply under every comment",
    text: "A public reply the moment they comment.",
    preview: {
      screen: "post",
      // Short enough that the comment and its reply fit on the screen.
      post: {
        thumbnailUrl: "/mascot.png",
        caption: "Comment GUIDE for the guide 👇",
        likeCount: null,
      },
      keyword: "GUIDE",
      commentReply: "Sent you a DM, {{first_name}} ✨",
      openingDm: null,
      dmMessage: "",
      buttons: [],
    },
  },
  {
    id: "demo-dm",
    show: "group-has-[#demo-dm:checked]:block",
    title: "Send the link by DM",
    text: "Your link lands straight in their inbox.",
    preview: {
      screen: "dm",
      post: null,
      keyword: null,
      commentReply: null,
      openingDm: null,
      dmMessage: "Hey {{first_name}}! Here's the setup guide you asked for ✨",
      buttons: ["Get the guide"],
    },
  },
  {
    id: "demo-tap",
    show: "group-has-[#demo-tap:checked]:block",
    title: "Ask for a tap first",
    text: "An opening message, one tap, then the link.",
    preview: {
      screen: "dm",
      post: null,
      keyword: null,
      commentReply: null,
      openingDm: {
        message: "Hey {{first_name}}! Thanks for the comment 💬",
        buttonLabel: "Send me the guide",
      },
      dmMessage: "Here's your guide ✨",
      buttons: ["Download"],
    },
  },
  {
    id: "demo-follow",
    show: "group-has-[#demo-follow:checked]:block",
    title: "Followers-only links",
    text: "Not following yet? They're asked to follow first.",
    preview: {
      screen: "dm",
      post: null,
      keyword: null,
      commentReply: null,
      openingDm: {
        message: "Follow @aghost, then tap below to get the guide 🔒",
        buttonLabel: "I'm following",
      },
      dmMessage: "Thanks for following! Here's your guide ✨",
      buttons: ["Get the guide"],
    },
  },
  {
    id: "demo-buttons",
    show: "group-has-[#demo-buttons:checked]:block",
    title: "Up to three link buttons",
    text: "A guide, a booking, a shop, all in one DM.",
    preview: {
      screen: "dm",
      post: null,
      keyword: null,
      commentReply: null,
      openingDm: null,
      dmMessage: "Hey {{first_name}}! Pick what you need 👇",
      buttons: ["Free guide", "Book a call", "Shop the look"],
    },
  },
]

/** "See it in action": pick an example, see what it produces. */
export function Demo({ cta }: { cta: React.ReactNode }) {
  return (
    <section
      aria-labelledby="demo-heading"
      id="demo"
      className="group notebook-demo"
    >
      <div className="notebook-section notebook-demo-layout">
        <div>
          <p className="notebook-hand notebook-section-kicker">
            Don’t take our word for it.
          </p>
          <h2
            id="demo-heading"
            className="notebook-title notebook-section-heading"
          >
            Try it out.
          </h2>
          <fieldset>
            <legend className="sr-only">Choose an example</legend>
            <ul className="notebook-demo-options">
              {examples.map((example, index) => (
                <li key={example.id}>
                  <input
                    type="radio"
                    name="demo"
                    id={example.id}
                    defaultChecked={index === 2}
                    className="peer sr-only"
                  />
                  <label htmlFor={example.id} className="notebook-demo-option">
                    <span>
                      <strong>{example.title}</strong>
                      <span className="mt-1 block text-xs text-black/60">
                        {example.text}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-6">{cta}</div>
        </div>
        <div className="notebook-demo-stage">
          {examples.map((example) => (
            <div
              key={example.id}
              className={cn("notebook-demo-preview hidden", example.show)}
            >
              {example.preview ? (
                <InstagramPreview account={account} {...example.preview} />
              ) : (
                <AgentSession />
              )}
            </div>
          ))}
          <p className="notebook-hand">A tiny demo. No real messages sent.</p>
        </div>
      </div>
    </section>
  )
}
