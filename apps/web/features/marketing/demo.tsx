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
      className="group relative isolate overflow-hidden bg-brand bg-[linear-gradient(to_right,rgb(255_255_255/0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.22)_1px,transparent_1px)] bg-size-[120px_120px] px-6 py-20"
    >
      <div className="mx-auto grid max-w-5xl items-center justify-center gap-14 md:grid-cols-[minmax(0,26rem)_auto] md:gap-20">
        <div className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-black/15 sm:p-8">
          <h2
            id="demo-heading"
            className="text-4xl font-extrabold tracking-[-0.04em]"
          >
            See it in action.
          </h2>
          <fieldset className="mt-6">
            <legend className="sr-only">Choose an example</legend>
            <ul className="grid gap-1">
              {examples.map((example, index) => (
                <li key={example.id}>
                  <input
                    type="radio"
                    name="demo"
                    id={example.id}
                    defaultChecked={index === 0}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={example.id}
                    className="grid cursor-pointer gap-0.5 rounded-2xl px-4 py-3 transition-colors peer-checked:bg-brand/15 peer-focus-visible:outline-2 peer-focus-visible:outline-black hover:bg-black/5 peer-checked:hover:bg-brand/15"
                  >
                    <span className="font-semibold">{example.title}</span>
                    <span className="text-sm text-brand-gray">
                      {example.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-6">{cta}</div>
        </div>
        <div className="mx-auto max-[389px]:[zoom:0.85]">
          {examples.map((example) => (
            <div key={example.id} className={cn("hidden", example.show)}>
              {example.preview ? (
                <InstagramPreview account={account} {...example.preview} />
              ) : (
                <AgentSession />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
