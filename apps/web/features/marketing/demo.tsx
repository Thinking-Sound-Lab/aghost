import type { ComponentProps } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { InstagramPreview } from "@/features/automations/instagram-preview"
import { SectionHeading } from "./shell"

type Preview = Omit<ComponentProps<typeof InstagramPreview>, "account">

export const demoAccount = { username: "aghost", picture: "/mascot.png" }

// Each example is a radio button, and CSS shows the picture for the checked
// one, so the section needs no client JavaScript. The `show` classes are
// written out in full because Tailwind only generates classes it finds in the
// source.
const examples: {
  id: string
  show: string
  title: string
  text: string
  preview: Preview
}[] = [
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

/** Pick an example, see what the commenter gets. */
export function Demo({ cta }: { cta: React.ReactNode }) {
  return (
    <section
      aria-labelledby="demo-heading"
      id="demo"
      className="group mx-auto mt-32 max-w-7xl px-5 sm:px-8"
    >
      <SectionHeading
        id="demo-heading"
        title="Pick what they get"
        description="Choose an example to see what someone gets after they comment. A demo only: no real messages are sent."
      />
      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-center gap-10 rounded-[2rem] bg-linear-to-br from-[#0a2a8a] via-brand-blue to-brand-cyan p-5 shadow-[0_0_120px_-30px_var(--color-brand-blue)] sm:p-12 lg:grid-cols-[1fr_auto] lg:gap-16">
        <div className="min-w-0">
          <fieldset>
            <legend className="sr-only">Choose an example</legend>
            <ul className="grid gap-2">
              {examples.map((example, index) => (
                <li key={example.id}>
                  <input
                    type="radio"
                    name="demo"
                    id={example.id}
                    defaultChecked={index === 1}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={example.id}
                    className="block cursor-pointer rounded-2xl bg-black/25 px-5 py-4 transition-colors peer-checked:bg-white peer-checked:text-black peer-focus-visible:ring-2 peer-focus-visible:ring-white hover:bg-black/40 peer-checked:hover:bg-white"
                  >
                    <strong className="text-lg">{example.title}</strong>
                    <span className="mt-0.5 block opacity-70">
                      {example.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-8">{cta}</div>
        </div>
        <div className="flex justify-center">
          {examples.map((example) => (
            <div
              key={example.id}
              className={cn("hidden max-[400px]:[zoom:0.8]", example.show)}
            >
              <InstagramPreview account={demoAccount} {...example.preview} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
