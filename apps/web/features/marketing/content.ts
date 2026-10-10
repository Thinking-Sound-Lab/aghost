import { AUTOMATION_LIMITS } from "@workspace/api/contract"

// One copy of the marketing text: the landing page, its structured data, and
// llms.txt all read it, so what crawlers are told matches what visitors see.

export const steps = [
  {
    title: "Pick a post or reel",
    text: "Connect your Instagram professional account, then choose one post or reel, or cover all of them at once.",
  },
  {
    title: "Choose your keywords",
    text: `Add up to ${AUTOMATION_LIMITS.maxKeywords} trigger words, like GUIDE or LINK. Match them anywhere in a comment, as a whole word, or exactly. Or reply to every comment.`,
  },
  {
    title: "Write the DM",
    text: `Write your message, add up to ${AUTOMATION_LIMITS.maxDmButtons} link buttons, and switch it on. Every matching comment gets your DM.`,
  },
]

export const features = [
  {
    title: "Keyword triggers",
    text: `Up to ${AUTOMATION_LIMITS.maxKeywords} keywords per automation, on one post or on every post and reel.`,
  },
  {
    title: "Public comment replies",
    text: "Reply under the comment too, so everyone sees the DM is on its way.",
  },
  {
    title: "Tap-to-open DMs",
    text: "Open with a short message and a button. Your link follows when they tap.",
  },
  {
    title: "Personal DMs with link buttons",
    text: `Greet people by first name or username, and add up to ${AUTOMATION_LIMITS.maxDmButtons} link buttons.`,
  },
  {
    title: "Followers-only links",
    text: "Send the link only to people who follow you. Everyone else is asked to follow first.",
  },
  {
    title: "Inbox, contacts, and stats",
    text: "Answer DMs in one inbox, and see comments, DMs sent, and link clicks for every automation.",
  },
]

export const faqs = [
  {
    question: "What is aghost?",
    answer:
      "aghost is an Instagram DM automation tool. It watches the comments on your posts and reels. When a comment contains a keyword you chose, aghost replies in public and sends the commenter a DM with your link.",
  },
  {
    question: "What is comment-to-DM automation?",
    answer:
      "Comment-to-DM automation sends a private message to someone as soon as they comment on your post. Creators and brands use it to deliver links, guides, discount codes, and sign-up pages, because links in Instagram captions and comments are not clickable.",
  },
  {
    question: "Do I need a business or creator account?",
    answer:
      "Yes. Instagram allows automated replies only from professional accounts, which means a Business or Creator account. Switching is free in Instagram's settings.",
  },
  {
    question: "Does Instagram allow automated DMs?",
    answer:
      "Yes, within limits. Instagram lets a professional account send one private reply to each comment, within seven days of the comment. aghost works inside those rules. You connect your account by authorising aghost with Instagram, and you never share your password.",
  },
  {
    question: "Why does the first DM have a button?",
    answer:
      "Instagram allows one automatic message per comment. Once the commenter responds, for example by tapping a button, you can message them for the next 24 hours. With an opening message, the commenter taps its button and the DM with your link follows. The opening message is optional: without it, the link DM is sent straight away.",
  },
  {
    question: "Can aghost reply to every comment, not only keywords?",
    answer: `Yes. An automation can react to any comment, or only to comments that contain one of up to ${AUTOMATION_LIMITS.maxKeywords} keywords. It can cover one post or reel, or all of them.`,
  },
  {
    question: "Can I send the link only to my followers?",
    answer:
      "Yes. With the follower rule on, people who already follow you get the link straight away. Everyone else is asked to follow first.",
  },
  {
    question: "How is aghost different from ManyChat?",
    answer:
      "ManyChat is a chatbot platform for several channels, including Instagram, Messenger, and WhatsApp, with a visual flow builder. aghost does one job: Instagram comment-to-DM automation, set up in three steps.",
  },
]
