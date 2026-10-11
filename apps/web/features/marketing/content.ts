import { AUTOMATION_LIMITS } from "@workspace/api/contract"

// One copy of the marketing text: the landing page, its structured data, and
// llms.txt all read it, so what crawlers are told matches what visitors see.

/** The agents the setup skill names. Any MCP client over HTTP works. */
export const agentClients = ["Claude Code", "Codex", "Cursor"]

/** What a workspace API key lets an agent do, over MCP or the REST API. */
export const agentAbilities = [
  "Create, edit, pause, and delete automations",
  "Read each automation's stats and its log of every DM",
  "Look up your accounts, posts, and contacts",
  "Read the inbox and reply to conversations",
]

/** Facts about the product, not usage figures: aghost has none to show yet. */
export const facts = [
  { value: "MCP", label: "and a REST API, for your AI agent" },
  { value: "24/7", label: "replies, even while you sleep" },
  {
    value: String(AUTOMATION_LIMITS.maxKeywords),
    label: "keywords per automation",
  },
  {
    value: String(AUTOMATION_LIMITS.maxDmButtons),
    label: "link buttons per DM",
  },
]

export const steps = [
  {
    title: "Connect Instagram",
    text: "Sign in with Google, then connect your Instagram professional account through Instagram's own login. You never share your password.",
  },
  {
    title: "Connect your agent",
    text: "Create an API key in Settings and copy the setup skill into Claude Code, Codex, or Cursor. Prefer to click? Skip this step and use the dashboard.",
  },
  {
    title: "Say what you want",
    text: "Ask in plain words: “DM the guide to everyone who comments GUIDE.” Your agent finds the post, sets the keywords, and writes the DM.",
  },
]

export const features = [
  {
    label: "Agentic",
    title: "Run it from your AI agent",
    text: "An MCP server and a REST API let Claude Code, Codex, Cursor, or any MCP client build and manage your automations.",
  },
  {
    label: "Comment automation",
    title: "Keyword triggers",
    text: `Up to ${AUTOMATION_LIMITS.maxKeywords} keywords per automation, matched anywhere in a comment, as a whole word, or exactly.`,
  },
  {
    label: "Public replies",
    title: "Reply under the comment",
    text: "Answer in public too, so everyone scrolling sees the DM is on its way.",
  },
  {
    label: "Tap to open",
    title: "Tap-to-open DMs",
    text: "Open with a short message and a button. Your link follows the moment they tap.",
  },
  {
    label: "Link buttons",
    title: "Personal DMs with link buttons",
    text: `Greet people by first name or username, and add up to ${AUTOMATION_LIMITS.maxDmButtons} link buttons.`,
  },
  {
    label: "Follower growth",
    title: "Followers-only links",
    text: "Send the link only to people who follow you. Anyone Instagram can't confirm as a follower is asked to follow first.",
  },
]

export const faqs = [
  {
    question: "What is aghost?",
    answer:
      "aghost is agentic DM automation for Instagram. It watches the comments on your posts and reels. When a comment contains a keyword you chose, aghost replies in public and sends the commenter a DM with your link. You can run it from the dashboard or hand it to an AI agent.",
  },
  {
    question: "What does agentic mean?",
    answer:
      "It means an AI agent can operate aghost for you. Connect Claude Code, Codex, Cursor, or any MCP client with an API key, and the agent can create, edit, pause, and delete automations, read their stats and delivery logs, look up contacts, and read and answer the inbox.",
  },
  {
    question: "Which AI agents work with aghost?",
    answer:
      "Any client that speaks MCP over HTTP with a Bearer token. The setup skill has instructions for Claude Code, Codex, and Cursor. Everything is also available as a REST API with an OpenAPI document, for agents and scripts that don't use MCP.",
  },
  {
    question: "What can't an agent do?",
    answer:
      "An agent's API key can't create more keys, change workspace settings, or connect or disconnect Instagram accounts. You create keys in Settings and can revoke one at any time; it stops working on the next request.",
  },
  {
    question: "Will Instagram flag my account?",
    answer:
      "aghost sends messages only the way Instagram allows professional accounts to: one private reply to each comment, within seven days of the comment, and more messages only after the person responds. You connect through Instagram's own login and never share your password.",
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
    question: "Does it work on reels?",
    answer:
      "Yes. Comments on reels work exactly like comments on posts. An automation can watch one post or reel, or all of them.",
  },
  {
    question: "Why does the first DM have a button?",
    answer:
      "Instagram allows one automatic message per comment. Once the commenter responds, for example by tapping a button, you can message them for the next 24 hours. With an opening message, the commenter taps its button and the DM with your link follows. The opening message is optional: without it, and without the follower rule, the link DM is sent straight away.",
  },
  {
    question: "Can aghost reply to every comment, not only keywords?",
    answer: `Yes. An automation can react to any comment, or only to comments that contain one of up to ${AUTOMATION_LIMITS.maxKeywords} keywords. It can cover one post or reel, or all of them.`,
  },
  {
    question: "Can I send the link only to my followers?",
    answer:
      "Yes. With the follower rule on, people Instagram can confirm as your followers get the link straight away. Everyone else gets a message asking them to follow, and the link is sent once they tap to confirm.",
  },
  {
    question: "Do you track link clicks?",
    answer:
      "Yes. Every automation shows its comments, DMs sent, and link clicks, and a log of each DM: sent, waiting for a tap, or failed.",
  },
  {
    question: "How is aghost different from ManyChat?",
    answer:
      "ManyChat is a chatbot platform for several channels, including Instagram, Messenger, and WhatsApp, with a visual flow builder. aghost does one job, Instagram comment-to-DM automation, and lets an AI agent run it over MCP.",
  },
]
