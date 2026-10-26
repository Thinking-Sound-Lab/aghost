import { AUTOMATION_LIMITS, PLAN_IDS, PLANS } from "@workspace/api/contract"
import { price } from "@/features/billing/plan-cards"

// One copy of the marketing text: the landing page, its structured data, and
// llms.txt all read it, so what crawlers are told matches what visitors see.

/** The platforms a post can go to, in the order the site names them. */
const platformNames = "Instagram, Facebook, LinkedIn, X, Threads and YouTube"

export const productSummary = `aghost schedules posts to ${platformNames}, turns Instagram comments into DMs, and tracks every channel. Run it from the dashboard or an AI agent over MCP or REST.`

/** The hero's promise, in one sentence under the headline. */
export const heroSummary = `Schedule one post to ${platformNames}, and turn Instagram comments into DMs. From your dashboard or your AI agent.`

export const growthCta = {
  title: "Your audience is everywhere. Be there with one post.",
  description: "Six platforms. Every comment answered. One workspace.",
}

const schedulingFeature = {
  label: "Scheduling",
  title: "Plan the month in one calendar",
  text: "Posts, reels, carousels and stories, with Trial Reels and DM automations ready before they publish.",
}

/** Who signs up, and what each of them gets out of it. */
export const audiences = [
  {
    title: "Creators",
    text: "Post one reel everywhere. Send your link to everyone who comments.",
  },
  {
    title: "Brands and shops",
    text: "One launch calendar for every channel. Product links in every DM.",
  },
  {
    title: "Agencies",
    text: "Up to 100 channels in one workspace, with analytics for each.",
  },
  {
    title: "Developers",
    text: "One API key for MCP and REST: schedule, automate, read analytics.",
  },
]

const planPrices = PLAN_IDS.map((id) => {
  const plan = PLANS[id]
  return `${plan.name} ${price(plan.prices.USD.monthly, "USD")}/month for ${plan.channels} channels`
})

/** The agents the setup skill names. Any MCP client over HTTP works. */
export const agentClients = ["Claude Code", "Codex", "Cursor"]

/** What a workspace API key lets an agent do, over MCP or the REST API. */
export const agentAbilities = [
  "Schedule posts to all six platforms, with a caption per channel",
  "Edit or cancel any scheduled post",
  "Read analytics and posting times for every channel",
  "Create, pause and edit Instagram DM automations",
  "Read automation stats and the log of every DM",
  "Read and reply to the Instagram inbox",
]

export const steps = [
  {
    title: "Connect your channels",
    text: "Sign in to each platform once. Every account is one channel.",
  },
  {
    title: "Write once, preview everywhere",
    text: "One caption, tuned per channel and previewed on a phone.",
  },
  {
    title: "Turn comments into DMs",
    text: "Attach an automation to an Instagram post. Commenters get your link.",
  },
  {
    title: "See what worked",
    text: "Reach, clicks and best posting times for every channel.",
  },
]

export const features = [
  {
    label: "Cross-posting",
    title: "One post, six platforms",
    text: `Schedule to ${platformNames}. Each copy is checked against its platform's limits.`,
  },
  {
    label: "Platform previews",
    title: "See it the way your audience will",
    text: "Preview every post as it appears on X, LinkedIn, Instagram or YouTube.",
  },
  {
    label: "Per-channel captions",
    title: "One caption, tuned per channel",
    text: "Keep it in sync, or write a version for one channel.",
  },
  schedulingFeature,
  {
    label: "Agentic",
    title: "Run it from your AI agent",
    text: "Claude Code, Codex or Cursor schedule posts to every platform, run automations and read analytics over MCP or REST.",
  },
  {
    label: "Comment automation",
    title: "Keyword triggers",
    text: `Up to ${AUTOMATION_LIMITS.maxKeywords} keywords, or any comment.`,
  },
  {
    label: "Public replies",
    title: "Reply under the comment",
    text: "Let everyone see the DM is on its way.",
  },
  {
    label: "Tap to open",
    title: "Tap-to-open DMs",
    text: "A short opener and a button. The link follows the tap.",
  },
  {
    label: "Link buttons",
    title: "Personal DMs with link buttons",
    text: `First names and up to ${AUTOMATION_LIMITS.maxDmButtons} link buttons.`,
  },
  {
    label: "Follower growth",
    title: "Followers-only links",
    text: "Non-followers are asked to follow before they get the link.",
  },
  {
    label: "Product carousel · Growth and up",
    title: "Your products, one swipe away",
    text: "Up to 10 product cards in a DM, each with its own tracked link.",
  },
  {
    label: "Follow-up nudges · Business and up",
    title: "A gentle reminder, automatically",
    text: "One follow-up after 30 minutes to 20 hours. Stops when they reply or click.",
  },
  {
    label: "Analytics",
    title: "Know what worked, everywhere",
    text: "Reach, views and engagement per channel, plus clicks per automation.",
  },
  {
    label: "Inbox",
    title: "Keep the conversation going",
    text: "Answer Instagram DMs where the automation leaves off.",
  },
]

export const faqs = [
  {
    question: "What is aghost?",
    answer: productSummary,
  },
  {
    question: "Which platforms can I post to?",
    answer: `${platformNames}. Each connected account is one channel on your plan.`,
  },
  {
    question: "Can I write a different caption for each platform?",
    answer:
      "Yes. Every channel shares one caption until you give it its own. YouTube posts also get a title.",
  },
  {
    question: "How much does aghost cost?",
    answer: `${planPrices.join(", ")}. Every plan includes all six platforms, analytics, MCP and REST, and unlimited DMs and contacts. Prices in USD, taxes included.`,
  },
  {
    question: "Which AI agents work with aghost?",
    answer:
      "Claude Code, Codex, Cursor or any MCP client over HTTP. There is also a REST API.",
  },
  {
    question: "Can my AI agent post to every platform?",
    answer:
      "Yes. Agents schedule posts to all six platforms, with a caption per channel, and read analytics on each.",
  },
  {
    question: "What can't an agent do?",
    answer:
      "Create API keys, change settings, or connect and disconnect accounts. You can revoke a key at any time.",
  },
  {
    question: "What is comment-to-DM automation?",
    answer:
      "An automatic DM to anyone who comments on your post, usually with a link, since links in Instagram captions aren't clickable.",
  },
  {
    question: "Can I set up the DM before the post goes live?",
    answer: "Yes. Attach the automation while you schedule the post or reel.",
  },
  {
    question: "Will Instagram flag my account?",
    answer:
      "aghost follows Instagram's rules: one private reply per comment within seven days, and more messages only after the person responds.",
  },
  {
    question: "Do I need a business or creator account?",
    answer:
      "For DM automation, yes. Switching is free in Instagram's settings.",
  },
  {
    question: "Why does the first DM have a button?",
    answer:
      "Instagram allows one automatic message per comment. A tap opens a 24-hour window, so your link can follow. The button is optional.",
  },
  {
    question: "Can I send the link only to my followers?",
    answer: "Yes. Everyone else is asked to follow first, then gets the link.",
  },
  {
    question: "How is aghost different from ManyChat?",
    answer:
      "ManyChat is a multi-channel chatbot builder. aghost combines scheduling to six platforms with Instagram DM automation, run by you or your AI agent.",
  },
  {
    question: "How is aghost different from Buffer?",
    answer:
      "aghost also schedules to six platforms, and adds Instagram DM automation, an inbox and API access for AI agents.",
  },
]
