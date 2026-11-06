import {
  AUTOMATION_LIMITS,
  PLANS,
  PLATFORMS,
  TRIAL_DAYS,
  socialSetCount,
  type PlanId,
} from "@workspace/api/contract"
import { price } from "@/features/billing/plan-cards"
import { platformNames } from "./content"

// One page per competitor and a hub that compares them all. Competitor facts
// come from their own pricing, product and developer pages on the `checked`
// date and are linked in `sources`; aghost's come from the plan contract. Say
// "not listed on its pricing page" for what a page leaves out, never "doesn't
// have": a page that is silent proves nothing about the product.

type Faq = { question: string; answer: string }

type CompareTableData = {
  caption: string
  headings: string[]
  rows: string[][]
}

/** The answers every comparison gives, so the hub can line them up. */
type Glance = {
  what: string
  scheduling: string
  commentToDm: string
  agents: string
  pricing: string
}

type Comparison = {
  slug: string
  name: string
  kind: "messaging" | "scheduling"
  title: string
  description: string
  /** When the competitor's pages were last read, as YYYY-MM-DD. */
  checked: string
  /** The difference in a paragraph that stands alone. */
  summary: string
  /** Who each tool suits. The first line of each also sits on the hub. */
  fit: { aghost: string[]; them: string[] }
  glance: Glance
  /** Rows of the at-a-glance table beyond the shared ones. */
  rows: { label: string; aghost: string; them: string }[]
  sections: { id: string; title: string; paragraphs: string[] }[]
  pricing: { before: string[]; tables?: CompareTableData[]; after?: string[] }
  switching: string[]
  faqs: Faq[]
  sources: { label: string; href: string }[]
}

export const glanceLabels: Record<keyof Glance, string> = {
  what: "What it is",
  scheduling: "Post scheduling",
  commentToDm: "Instagram comment-to-DM",
  agents: "AI agent access",
  pricing: "Price",
}

/** "November 7, 2026", from a YYYY-MM-DD date. */
export function checkedOn(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

/** When every competitor's pages were last read. Recheck them together. */
const checked = "2026-11-07"
const checkedText = checkedOn(checked)
export const lastChecked = checked

const monthly = (id: PlanId) => price(PLANS[id].prices.USD.monthly, "USD")
const yearlyPerMonth = (id: PlanId) =>
  price(PLANS[id].prices.USD.yearly / 12, "USD")
const yearly = (id: PlanId) => price(PLANS[id].prices.USD.yearly, "USD")

const keywords = AUTOMATION_LIMITS.maxKeywords
const buttons = AUTOMATION_LIMITS.maxDmButtons
const trial = `${TRIAL_DAYS}-day free trial`

export const aghostGlance: Glance = {
  what: "Social media scheduling and Instagram DM automation in one workspace",
  scheduling: `${platformNames}, with a caption per channel`,
  commentToDm:
    "Comments on posts and reels, by keyword or any comment, with public replies, link buttons and followers-only links",
  agents:
    "MCP server and REST API for posts, analytics, automations and the inbox, on every plan",
  pricing: `${monthly("pro")}/month, or ${yearlyPerMonth("pro")}/month billed yearly, for ${socialSetCount(PLANS.pro.socialSets)}. Unlimited contacts and DMs. ${trial}`,
}

/** What aghost's comment automation does, for the comparisons that need it. */
const aghostAutomation = `When someone comments on a post or reel, aghost sends them a DM. Trigger on up to ${keywords} keywords or any comment, reply publicly under the comment, open with a tap-to-open message, and add up to ${buttons} link buttons. Non-followers can be asked to follow first. Growth adds a carousel of up to ${AUTOMATION_LIMITS.maxCarouselCards} products, and Business adds one follow-up nudge that stops when they reply or click.`

const aghostAgents = `aghost's MCP server and REST API cover the whole workspace, so Claude Code, Codex or Cursor can schedule a post, set up its DM automation and read the results in one conversation. Every plan includes them.`

const noFreePlan = `No. Every plan starts with a ${trial}`

// ManyChat on annual billing: the monthly price, the active contacts it
// includes, and the price of each one beyond them.
const manychatPlans = [
  { name: "Essential", price: 14, contacts: 250, extra: 0.082 },
  { name: "Pro", price: 29, contacts: 2_500, extra: 0.038 },
  { name: "Business", price: 69, contacts: 7_500, extra: 0.018 },
  { name: "Advanced", price: 139, contacts: 25_000, extra: 0.0028 },
]

/** ManyChat's lowest price for a month with this many active contacts. */
function manychatMonth(contacts: number): string {
  const best = manychatPlans
    .map((plan) => ({
      name: plan.name,
      cost: plan.price + Math.max(0, contacts - plan.contacts) * plan.extra,
    }))
    .reduce((cheapest, plan) => (plan.cost < cheapest.cost ? plan : cheapest))
  return `$${Math.round(best.cost)} on ${best.name}`
}

const contactCount = (count: number) => count.toLocaleString("en")

export const comparisons: Comparison[] = [
  {
    slug: "aghost-vs-manychat",
    name: "ManyChat",
    kind: "messaging",
    title: "aghost vs ManyChat: a flat-priced ManyChat alternative",
    description:
      "Compare aghost and ManyChat for Instagram comment-to-DM, post scheduling, AI agents, and what each costs as your contacts grow.",
    checked,
    summary:
      "Both send a DM when someone comments on your Instagram post. ManyChat is a chat automation platform: a flow builder, AI replies and seven channels, priced by how many people you message each month. aghost also schedules your posts to six platforms, charges a flat price with no contact limits, and lets your AI agent run all of it.",
    fit: {
      aghost: [
        "You also schedule posts, and want one flat price however many people comment",
        "You run comment-to-DM campaigns for launches, lead magnets or product drops",
        "You want your AI agent to schedule a post and set up its DM in one go",
      ],
      them: [
        "You need branching flows, AI replies to customers, or WhatsApp, TikTok, SMS and email",
        "You trigger on DMs, story replies or new followers",
        "You message few people and want a free plan",
      ],
    },
    glance: {
      what: "Chat automation for Instagram, WhatsApp, Messenger, TikTok, Telegram, SMS and email",
      scheduling: "Not listed on its pricing or Instagram pages",
      commentToDm:
        "Comment and DM replies, new-follower messages and lead capture, with a Flow Builder for branching paths",
      agents: "A public API for developers",
      pricing:
        "Free for 25 active contacts a month. Pro is $29/month billed annually for 2,500, then $0.038 per extra contact",
    },
    rows: [
      {
        label: "Channels",
        aghost: "Posts to six platforms; DMs on Instagram",
        them: "Instagram, WhatsApp, Messenger, TikTok, Telegram, SMS and email; 2 channels to all, by plan",
      },
      {
        label: "Free plan",
        aghost: noFreePlan,
        them: "Yes, for 25 active contacts a month. Essential and Pro have 14-day trials",
      },
      {
        label: "What raises the price",
        aghost: "More social sets, one per brand",
        them: "More active contacts, or more channels",
      },
    ],
    sections: [
      {
        id: "automation",
        title: "Comment-to-DM and chat automation",
        paragraphs: [
          "ManyChat's Instagram tools reply to comments and DMs, message new followers, and collect emails and phone numbers. Its Flow Builder lets a conversation branch: ask a question, tag the answer and send each person down a different path. Quick Automations cover common setups, and its AI can build flows for you.",
          aghostAutomation,
          "aghost has no flow builder, no DM or story-reply triggers, and no AI that answers customers for you. If your campaign needs those, ManyChat fits better.",
        ],
      },
      {
        id: "scheduling",
        title: "Scheduling and AI agents",
        paragraphs: [
          `ManyChat's pricing and Instagram pages don't list post scheduling, so you'd still need a scheduler for your content. aghost schedules posts, reels, carousels and stories to ${platformNames} from one calendar, and you can attach the DM automation to a post before it goes live.`,
          `${aghostAgents} ManyChat offers a public API for developers.`,
        ],
      },
    ],
    pricing: {
      before: [
        "ManyChat charges by active contacts: everyone you message or hear from in a month, whether through automations, AI, broadcasts or the inbox. Each plan includes a number of them, and each one beyond that costs extra.",
      ],
      tables: [
        {
          caption: `ManyChat plans billed annually, checked ${checkedText}`,
          headings: [
            "Plan",
            "Price a month",
            "Active contacts included",
            "Each extra contact",
          ],
          rows: [
            ["Free", "$0", "25", "Not available"],
            ...manychatPlans.map((plan) => [
              plan.name,
              `$${plan.price}`,
              contactCount(plan.contacts),
              `$${plan.extra}`,
            ]),
          ],
        },
        {
          caption: `A month's cost by active contacts, both billed yearly. aghost Pro covers ${socialSetCount(PLANS.pro.socialSets)}`,
          headings: [
            "Active contacts in a month",
            "Lowest ManyChat price",
            "aghost Pro",
          ],
          rows: [1_000, 2_500, 10_000, 25_000, 50_000].map((contacts) => [
            contactCount(contacts),
            manychatMonth(contacts),
            yearlyPerMonth("pro"),
          ]),
        },
      ],
      after: [
        `A reel that 10,000 people comment on in a month makes 10,000 active contacts. aghost Pro costs the same ${yearlyPerMonth("pro")} a month billed yearly however many people comment. Instagram's own messaging limits still apply to both.`,
        "ManyChat's plans also differ in channels and features, and monthly billing costs more per extra contact ($0.05 on Pro). Its prices exclude tax and vary by billing country. aghost's are in US dollars with tax included.",
      ],
    },
    switching: [
      "ManyChat flows don't import into aghost. List each live automation: its post, keywords, messages, buttons and any branching. Rebuild the comment-to-DM ones in aghost and test them from a second Instagram account.",
      "Turn off the ManyChat automation on a post before you turn on aghost's, so one comment never gets two DMs. Keep ManyChat for anything that needs a flow, another channel or AI replies.",
    ],
    faqs: [
      {
        question: "Is aghost a good ManyChat alternative?",
        answer: `For Instagram comment-to-DM campaigns, yes, especially if you also schedule posts or your contact count is growing. aghost costs a flat ${monthly("pro")}/month with unlimited contacts. Stay with ManyChat if you rely on its Flow Builder, AI replies or channels other than Instagram.`,
      },
      {
        question: "Is aghost cheaper than ManyChat?",
        answer: `It depends on how many people you message. Up to 2,500 active contacts a month, ManyChat Pro is $29/month billed annually and aghost Pro is ${yearlyPerMonth("pro")}/month billed yearly. At 10,000 contacts, ManyChat's lowest price is ${manychatMonth(10_000)}, while aghost stays at ${yearlyPerMonth("pro")}.`,
      },
      {
        question: "Does aghost have a free plan like ManyChat?",
        answer: `No. Every aghost plan starts with a ${trial}. ManyChat's free plan covers 25 active contacts a month.`,
      },
      {
        question: "Can ManyChat schedule Instagram posts?",
        answer: `ManyChat's pricing and Instagram pages don't list post scheduling (checked ${checkedText}). aghost schedules posts, reels, carousels and stories to ${platformNames}.`,
      },
    ],
    sources: [
      { label: "ManyChat pricing", href: "https://manychat.com/pricing" },
      {
        label: "ManyChat for Instagram",
        href: "https://manychat.com/product/instagram",
      },
      {
        label: "ManyChat API token guide",
        href: "https://help.manychat.com/hc/en-us/articles/14959510331420-How-to-generate-a-token-for-the-Manychat-API-and-where-to-get-parameters",
      },
    ],
  },
  {
    slug: "aghost-vs-chatfuel",
    name: "Chatfuel",
    kind: "messaging",
    title: "aghost vs Chatfuel: Instagram comment-to-DM compared",
    description:
      "Compare aghost and Chatfuel for Instagram comment-to-DM, post scheduling, AI agents, and usage-based versus flat pricing.",
    checked,
    summary:
      "Chatfuel is an AI agent that answers your customers. It replies to comments and DMs, qualifies leads and books meetings across WhatsApp, Instagram, Facebook, TikTok and website chat, and bills AI replies as usage. aghost schedules posts to six platforms and sends the DM you wrote when someone comments on Instagram, at a flat price.",
    fit: {
      aghost: [
        "You want to schedule posts and send set DMs from comments, with no usage to meter",
        "You want every commenter to get the exact message you reviewed",
        "You also post to Facebook, LinkedIn, X, Threads and YouTube",
      ],
      them: [
        "You want an AI agent to answer customers on WhatsApp, Instagram, Facebook, TikTok and your website",
        "You qualify leads from ads or book meetings in chat",
        "You send WhatsApp broadcasts",
      ],
    },
    glance: {
      what: "An AI agent that answers customers on WhatsApp, Instagram, Facebook, TikTok and website chat",
      scheduling: "Not listed on its pricing or Instagram pages",
      commentToDm:
        "Keyword, story-reply or any-comment triggers. Its AI writes the replies and hands off to your team",
      agents:
        "An official MCP server for Claude, ChatGPT, Cursor and others, plus an API and SDK",
      pricing:
        "$20/month, or $18/month billed yearly, with $20 of usage a month. AI replies beyond that need credits",
    },
    rows: [
      {
        label: "Who writes the DM",
        aghost: "You do. aghost sends your message and links",
        them: "Its AI, from your knowledge base and reply rules",
      },
      {
        label: "Channels",
        aghost: "Posts to six platforms; DMs on Instagram",
        them: "WhatsApp, Instagram, Facebook, TikTok and website chat",
      },
      {
        label: "Free trial",
        aghost: `${TRIAL_DAYS} days on any plan`,
        them: "7 days, with a starting balance for the bot",
      },
    ],
    sections: [
      {
        id: "automation",
        title: "Your message or an AI agent's",
        paragraphs: [
          "Chatfuel's AI handles the conversation. You give it a knowledge base and reply rules, and it answers comments and questions, sells products and books meetings, handing off to your team when it should.",
          `aghost sends the message you wrote. When someone comments a keyword, or anything, on a post or reel, they get your DM with up to ${buttons} link buttons, after an optional public reply and tap-to-open opener. Nothing is generated, so every commenter gets what you reviewed. aghost doesn't answer open-ended questions; you pick those up in its inbox.`,
        ],
      },
      {
        id: "scheduling",
        title: "Scheduling and AI agents",
        paragraphs: [
          "Chatfuel's pricing and Instagram pages don't list post scheduling. aghost schedules posts, reels, carousels and stories to six platforms and attaches the DM automation before the post goes live.",
          "Both have an MCP server. Chatfuel's lets Claude, ChatGPT or Cursor set up and review its AI agent across your chat channels. aghost's lets your agent schedule posts to six platforms, create Instagram automations, read analytics and reply in the inbox.",
        ],
      },
    ],
    pricing: {
      before: [
        "Chatfuel's Business plan is $20 a month, or $18 a month billed yearly ($216), and includes $20 of usage each month. AI replies, WhatsApp templates and lead events sent to Meta are metered from that balance; its calculator puts one AI reply at about $0.0093. When the balance runs out, AI replies pause until you add credits or move up a plan, and unused usage doesn't carry over.",
      ],
      tables: [
        {
          caption: `Chatfuel Business plans billed yearly, checked ${checkedText}`,
          headings: ["Plan", "Price a month", "Usage included a month"],
          rows: [
            ["Business S", "$18", "$20"],
            ["Business M", "$40.50", "$50"],
            ["Business L", "$81", "$100"],
            ["Business XL", "$153", "$200"],
            ["Business XXL", "$366.67", "$500"],
          ],
        },
      ],
      after: [
        `aghost doesn't meter messages. Pro is ${monthly("pro")}/month, or ${yearlyPerMonth("pro")}/month billed yearly, with unlimited contacts and DMs; Instagram's messaging limits still apply. Both include unlimited contacts.`,
      ],
    },
    switching: [
      "Chatfuel bots don't import into aghost. For each comment campaign, note the post, the trigger and what the DM should say, then write that message in aghost and test it from a second account.",
      "If customers rely on the AI agent to answer questions, keep Chatfuel for that. Use aghost for scheduled posts and their comment campaigns, with each post's comments handled by one tool.",
    ],
    faqs: [
      {
        question: "Is aghost a Chatfuel alternative?",
        answer:
          "For comment-to-DM campaigns and post scheduling, yes. For an AI agent that answers customer questions on several channels, no; that's Chatfuel's focus.",
      },
      {
        question: "Does aghost use AI to reply to comments?",
        answer:
          "No. aghost sends the message and links you wrote, so every commenter gets the reply you reviewed. Your own AI agent can write and set up those automations over MCP.",
      },
      {
        question: "Which is cheaper, Chatfuel or aghost?",
        answer: `Chatfuel starts lower, at $18/month billed yearly, but AI replies beyond the included $20 of usage need credits. aghost is a flat ${yearlyPerMonth("pro")}/month billed yearly with nothing metered.`,
      },
    ],
    sources: [
      { label: "Chatfuel pricing", href: "https://chatfuel.com/pricing" },
      {
        label: "Chatfuel for Instagram",
        href: "https://chatfuel.com/instagram",
      },
      { label: "Chatfuel MCP server", href: "https://chatfuel.com/mcp" },
    ],
  },
  {
    slug: "aghost-vs-linkdm",
    name: "LinkDM",
    kind: "messaging",
    title: "aghost vs LinkDM: Instagram auto-DM tools compared",
    description:
      "Compare aghost and LinkDM for Instagram comment-to-DM: triggers, DM limits, post scheduling, AI agents and price.",
    checked,
    summary:
      "LinkDM is a focused Instagram auto-DM tool for creators, with a free plan and triggers on posts, reels, stories, Lives and ads. aghost answers comments on posts and reels, and adds scheduling to six platforms, analytics and an MCP server for your AI agent, with no cap on DMs.",
    fit: {
      aghost: [
        "You want scheduling to six platforms and no monthly DM cap, run by you or your AI agent",
        "You want product carousels or a follow-up nudge in the DM",
        "You want analytics for every channel next to your automations",
      ],
      them: [
        "You want a free plan, or triggers on stories, Lives and ads",
        "You only need Instagram DMs and want the lowest price",
        "You want to DM people who commented before the automation existed",
      ],
    },
    glance: {
      what: "Instagram DM automation for creators",
      scheduling: "Not listed on its pricing page",
      commentToDm:
        "Posts, reels, stories, story mentions, Lives, ads and shares to your inbox. Public comment replies on Pro",
      agents: "API integration on its Enterprise plan",
      pricing:
        "Free for 1 account and 1,000 DMs a month. Pro is $19/month for 3 accounts and 25,000 DMs a month",
    },
    rows: [
      {
        label: "Monthly DM limit",
        aghost: "None. Instagram's messaging limits apply",
        them: "1,000 on Free, 25,000 on Pro, 300,000 on Platinum+",
      },
      {
        label: "Instagram accounts",
        aghost: `${PLANS.pro.socialSets} on Pro, ${PLANS.growth.socialSets} on Growth, ${PLANS.business.socialSets} on Business, each with five other platforms`,
        them: "1 on Free, 3 on Pro, 10 on Platinum+",
      },
      { label: "Free plan", aghost: noFreePlan, them: "Yes" },
    ],
    sections: [
      {
        id: "triggers",
        title: "Triggers and DM features",
        paragraphs: [
          "LinkDM triggers on more Instagram events than aghost: post and reel comments, story replies and mentions, Lives, ads and posts shared to your inbox. Pro adds public comment replies, a follower growth tool, reminder DMs, lead capture, and Rewind, which DMs people who commented before you set the automation up.",
          `aghost triggers on comments on posts and reels only. For those, it covers up to ${keywords} keywords or any comment, public replies, a tap-to-open opener, up to ${buttons} link buttons and followers-only links. Growth adds product carousels and Business adds a follow-up nudge.`,
        ],
      },
      {
        id: "scheduling",
        title: "Scheduling, analytics and AI agents",
        paragraphs: [
          `LinkDM's pricing page doesn't list post scheduling. aghost schedules to ${platformNames} and shows analytics for every channel.`,
          `${aghostAgents} LinkDM lists API integration on its Enterprise plan.`,
        ],
      },
    ],
    pricing: {
      before: [
        "LinkDM prices by Instagram accounts and DMs a month. aghost prices by social sets, each holding one Instagram account and one account on each of five other platforms, with no DM cap.",
      ],
      tables: [
        {
          caption: `Monthly prices, checked ${checkedText}. LinkDM's yearly plans are $182 for Pro and $832 for Platinum+`,
          headings: [
            "Plan",
            "Price a month",
            "Instagram accounts",
            "DMs a month",
          ],
          rows: [
            ["LinkDM Free", "$0", "1", "1,000"],
            ["LinkDM Pro", "$19", "3", "25,000"],
            ["LinkDM Platinum+", "$99", "10", "300,000"],
            ...(["pro", "growth", "business"] as const).map((id) => [
              `aghost ${PLANS[id].name}`,
              monthly(id),
              String(PLANS[id].socialSets),
              "No cap",
            ]),
          ],
        },
      ],
      after: [
        `For Instagram DMs alone, LinkDM costs less. aghost's price also covers scheduling and analytics on five more platforms, and its yearly plans start at ${yearly("pro")}.`,
      ],
    },
    switching: [
      "Automations don't import between the two. Rebuild each post's keywords, message and buttons in aghost, and test from a second account. Turn off the LinkDM automation for that post first, so a comment gets one DM.",
      "Keep LinkDM for story, Live or ad triggers if you rely on them; aghost doesn't send those.",
    ],
    faqs: [
      {
        question: "Is aghost a LinkDM alternative?",
        answer:
          "Yes, for comment-to-DM on posts and reels, especially if you also schedule posts or send more DMs than LinkDM's plans allow. Stay with LinkDM for story, Live and ad triggers, or for its free plan.",
      },
      {
        question: "Does aghost limit how many DMs I send?",
        answer:
          "No. aghost doesn't cap DMs or contacts on any plan. Instagram allows one private reply per comment, and more messages once the person responds.",
      },
      {
        question: "Does LinkDM have a free plan?",
        answer: `Yes: one Instagram account and 1,000 DMs a month (checked ${checkedText}). aghost has a ${trial} instead.`,
      },
    ],
    sources: [
      { label: "LinkDM pricing", href: "https://www.linkdm.com/pricing" },
    ],
  },
  {
    slug: "aghost-vs-buffer",
    name: "Buffer",
    kind: "scheduling",
    title: "aghost vs Buffer: a Buffer alternative with Instagram DMs",
    description:
      "Compare aghost and Buffer: platforms, Instagram comment-to-DM, AI agents over MCP, and per-channel versus per-brand pricing.",
    checked,
    summary:
      "Both schedule posts and have an MCP server for your AI agent. Buffer supports 12 networks, has a free plan and charges per channel. aghost supports six, adds Instagram comment-to-DM automation and an inbox, and charges per social set: one account on each platform.",
    fit: {
      aghost: [
        "You want Instagram comments to send a DM, and one price for six platforms",
        "You run several brands, each on Instagram, Facebook, LinkedIn, X, Threads and YouTube",
        "You want your AI agent to manage posts and DM automations together",
      ],
      them: [
        "You post to TikTok, Pinterest or Bluesky, or want a free plan",
        "You only manage two or three accounts",
        "You want comment replies across many networks in one inbox",
      ],
    },
    glance: {
      what: "Social media scheduling, comment replies and analytics",
      scheduling:
        "Instagram, Facebook, TikTok, LinkedIn, X, YouTube, Threads, Pinterest, Google Business Profile, Bluesky, Mastodon and Substack",
      commentToDm:
        "Not listed on its pricing page. Its community inbox replies to comments, with AI suggestions",
      agents:
        "An official MCP server for channels, posts, ideas and analytics, plus an API on every plan",
      pricing:
        "Free for 3 channels. Essentials is $5 per channel a month billed yearly",
    },
    rows: [
      {
        label: "Free plan",
        aghost: noFreePlan,
        them: "Yes: 3 channels, 10 scheduled posts each. Paid plans have 14-day trials",
      },
      {
        label: "How it's priced",
        aghost: "Per social set: one account on each of six platforms",
        them: "Per channel, meaning each social account",
      },
    ],
    sections: [
      {
        id: "dm",
        title: "Comments and DMs",
        paragraphs: [
          "Buffer's community inbox lets you reply to comments on most of the networks it supports, with AI-suggested and saved replies. Its pricing page doesn't list direct messages or DM automation.",
          "aghost turns Instagram comments into DMs: pick keywords or any comment, reply publicly, and send a DM with your link. Attach it while you schedule the post, so it's ready the moment the post goes live. Its inbox is where you answer the Instagram DMs that follow.",
        ],
      },
      {
        id: "scheduling",
        title: "Scheduling and AI agents",
        paragraphs: [
          `Buffer reaches more networks, including TikTok, Pinterest, Bluesky, Mastodon, Google Business Profile and Substack. aghost covers ${platformNames}, with a caption per channel and a preview of each post. If you post to TikTok or Pinterest, Buffer fits better.`,
          "Both have an official MCP server. Buffer's lets an AI assistant read your channels, schedule and edit posts, capture ideas and pull analytics. aghost's reads your accounts, schedules and edits posts and pulls analytics on its six platforms, and adds Instagram automations, their stats and the inbox. It has no tool for saving ideas.",
        ],
      },
    ],
    pricing: {
      before: [
        `Buffer charges per channel: Essentials is $5 a channel a month billed yearly ($60), Team is $10 ($120), and channels beyond 10 cost less. aghost charges per social set, which holds one account on each of its six platforms.`,
        `For one brand on six platforms, Buffer Essentials costs $360 a year and Team $720. aghost Pro covers the same six accounts for ${yearly("pro")} a year, with Instagram DM automation included. Buffer's Free plan covers 3 channels at no cost; aghost has no free plan.`,
      ],
    },
    switching: [
      "Buffer's queue doesn't import into aghost. Connect each account in aghost, recreate your upcoming posts, and delete them from Buffer so nothing publishes twice.",
      "Keep Buffer for TikTok, Pinterest or any other network aghost doesn't support.",
    ],
    faqs: [
      {
        question: "Is aghost a Buffer alternative?",
        answer:
          "Yes, if you post to Instagram, Facebook, LinkedIn, X, Threads or YouTube and want Instagram comments to send DMs. If you need TikTok, Pinterest or Bluesky, Buffer covers them and aghost doesn't.",
      },
      {
        question: "Does Buffer do Instagram DM automation?",
        answer: `Its pricing page lists comment replies in a community inbox, but not DMs or comment-to-DM automation (checked ${checkedText}).`,
      },
      {
        question: "Which is cheaper, Buffer or aghost?",
        answer: `For a few accounts, Buffer: its Free plan covers 3 channels. For one brand on all six of aghost's platforms, aghost Pro is ${yearly("pro")} a year against $360 on Buffer Essentials.`,
      },
      {
        question: "Do Buffer and aghost work with Claude?",
        answer:
          "Yes. Both run an official MCP server that Claude, Claude Code and other agents connect to. aghost's also manages Instagram DM automations and the inbox.",
      },
    ],
    sources: [
      { label: "Buffer pricing", href: "https://buffer.com/pricing" },
      {
        label: "Buffer MCP server",
        href: "https://developers.buffer.com/guides/integrations/mcp.html",
      },
    ],
  },
  {
    slug: "aghost-vs-hootsuite",
    name: "Hootsuite",
    kind: "scheduling",
    title: "aghost vs Hootsuite: a Hootsuite alternative for small teams",
    description:
      "Compare aghost and Hootsuite on scheduling, Instagram comment-to-DM, AI agents and price, for creators and small teams.",
    checked,
    summary: `Hootsuite is social media management for teams and enterprises: publishing, a shared inbox, social listening, approvals and reporting, priced per user from $99 a month billed annually. aghost covers scheduling to six platforms, Instagram comment-to-DM and analytics for one workspace price, from ${yearlyPerMonth("pro")} a month billed yearly.`,
    fit: {
      aghost: [
        `You're a creator or small team and want scheduling plus Instagram DMs from ${yearlyPerMonth("pro")} a month`,
        "You want Instagram comments to send your link automatically",
        "You want one MCP server for posts, automations and the inbox",
      ],
      them: [
        "You need social listening, approval workflows, message routing or enterprise security",
        "Several people work in the same inbox",
        "You report on social media ROI to leadership",
      ],
    },
    glance: {
      what: "Social media management for teams: publishing, inbox, listening and reporting",
      scheduling:
        "Up to 10 social accounts on Standard, unlimited on Professional and up",
      commentToDm:
        "Automated message and DM responses on Professional, $199 per user a month, and up",
      agents:
        "Official MCP servers for posts (Perch), the inbox (Nest), listening (Lumen) and advocacy (Parliament)",
      pricing:
        "Standard is $99 per user a month billed annually; Professional $199; Advanced $399",
    },
    rows: [
      {
        label: "How it's priced",
        aghost: "Per workspace, by number of social sets",
        them: "Per user",
      },
      {
        label: "Social listening",
        aghost: "No",
        them: "Yes, deeper on Professional and Enterprise",
      },
      {
        label: "Free trial",
        aghost: `${TRIAL_DAYS} days`,
        them: "14 days, with a daily posting limit",
      },
    ],
    sections: [
      {
        id: "teams",
        title: "Built for different team sizes",
        paragraphs: [
          "Hootsuite is built for social media teams. Standard covers publishing, a unified inbox, analytics, competitor benchmarking and social listening for up to 10 accounts. Professional adds unlimited accounts and inbox automation, Advanced adds approvals, message routing and team reporting, and Enterprise adds SSO and compliance.",
          "aghost is built for creators, brands and small teams: one calendar for six platforms, Instagram comment-to-DM automation, an inbox for Instagram DMs and analytics for each channel. It doesn't offer social listening, approval workflows or message routing.",
        ],
      },
      {
        id: "agents",
        title: "AI agents",
        paragraphs: [
          "Hootsuite runs a separate MCP server for each of its products: Perch drafts and plans posts, Nest triages the inbox, Lumen covers listening and Parliament runs employee advocacy.",
          "aghost has one MCP server and a REST API that schedule posts, run Instagram automations, read analytics and answer the inbox, included on every plan.",
        ],
      },
    ],
    pricing: {
      before: [
        "Hootsuite prices per user. Billed annually, Standard is $99 a user a month ($1,188 a year), Professional $199 and Advanced $399, and Enterprise is custom. Prices exclude tax, and monthly billing costs more. When we checked, Hootsuite was running a sale with 50% off Standard.",
        `aghost prices per workspace, with tax included. Pro is ${yearlyPerMonth("pro")} a month billed yearly (${yearly("pro")} a year) for one brand, and Business is ${monthly("business")} a month for ${socialSetCount(PLANS.business.socialSets)}, or ${PLANS.business.socialSets * PLATFORMS.length} accounts.`,
      ],
    },
    switching: [
      "Scheduled posts don't move between tools. Connect your accounts in aghost, recreate upcoming posts, and remove them from Hootsuite so nothing posts twice.",
      "If your team relies on approvals, routing or listening, make sure you can do without them before you switch.",
    ],
    faqs: [
      {
        question: "Is aghost a Hootsuite alternative?",
        answer:
          "For creators and small teams who mainly schedule posts and answer Instagram comments, yes, for a fraction of the price. Larger teams that need listening, approvals, message routing or SSO should stay with Hootsuite.",
      },
      {
        question: "How much does Hootsuite cost compared with aghost?",
        answer: `Hootsuite Standard is $99 per user a month billed annually, for up to 10 accounts. aghost Pro is ${yearlyPerMonth("pro")} a month billed yearly for one brand on six platforms, and Business is ${monthly("business")} a month for ${socialSetCount(PLANS.business.socialSets)}.`,
      },
      {
        question: "Does Hootsuite have an MCP server?",
        answer:
          "Yes, several: Perch for posts, Nest for the inbox, Lumen for listening and Parliament for employee advocacy. aghost has one MCP server for posts, Instagram automations, analytics and the inbox.",
      },
    ],
    sources: [
      { label: "Hootsuite plans", href: "https://www.hootsuite.com/plans" },
      {
        label: "Hootsuite MCP servers",
        href: "https://www.hootsuite.com/integrations/mcp",
      },
    ],
  },
  {
    slug: "aghost-vs-later",
    name: "Later",
    kind: "scheduling",
    title: "aghost vs Later: a Later alternative with Instagram DMs",
    description:
      "Compare aghost and Later: social sets, platforms, Instagram comment-to-DM, AI agents and price.",
    checked,
    summary:
      "Both group accounts into social sets and schedule a month of posts from one calendar. Later adds TikTok, Pinterest and Snapchat, a visual Instagram planner and Link in Bio. aghost adds X, Instagram comment-to-DM automation, an inbox on every plan, and an MCP server so your AI agent can run it.",
    fit: {
      aghost: [
        "You want Instagram comments to send DMs, X in your social set, or your AI agent to post for you",
        "You want an inbox on the entry plan",
        "You run up to 10 brands on one plan",
      ],
      them: [
        "You post to TikTok, Pinterest or Snapchat, or want Link in Bio and a visual planner",
        "You want the lowest price for one brand",
        "You collect user-generated content",
      ],
    },
    glance: {
      what: "Social media scheduling with a visual planner, Link in Bio and analytics",
      scheduling:
        "Instagram, Facebook, TikTok, Pinterest, LinkedIn, YouTube, Threads and Snapchat; 30 posts per profile a month on Starter",
      commentToDm:
        "Not listed on its pricing page. Its social inbox for Instagram DMs and comments starts on Growth",
      agents: "An API or MCP server isn't listed on its pricing page",
      pricing:
        "Starter is $18.75/month billed yearly for 1 social set; Growth $37.50 for 2",
    },
    rows: [
      {
        label: "Social set",
        aghost: "One account on each of six platforms",
        them: "One profile on each of eight platforms",
      },
      {
        label: "Inbox",
        aghost: "Instagram DMs, on every plan",
        them: "Instagram and Facebook DMs and comments, on Growth and up",
      },
      {
        label: "Free trial",
        aghost: `${TRIAL_DAYS} days`,
        them: "14 days",
      },
    ],
    sections: [
      {
        id: "dm",
        title: "Comments and DMs",
        paragraphs: [
          "Later's social inbox, on Growth and Scale, brings Instagram DMs, comments and mentions, and Facebook DMs and comments, into one place to answer by hand. Its pricing page doesn't list DM automation.",
          "aghost sends a DM with your link when someone comments on an Instagram post or reel, and you can attach that automation while you schedule the post. Its inbox, on every plan, is where those conversations continue.",
        ],
      },
      {
        id: "scheduling",
        title: "Scheduling and AI agents",
        paragraphs: [
          "Later's social set holds one profile each on Instagram, Facebook, TikTok, Pinterest, LinkedIn, YouTube, Threads and Snapchat. Starter allows 30 posts per profile a month and Growth 180. It also has a visual Instagram planner, Link in Bio and UGC collection.",
          `aghost's social set covers ${platformNames}, with a caption per channel and previews. Claude Code, Codex or Cursor can schedule posts, set up automations and read analytics over MCP or REST, on every plan. Later's pricing page doesn't list an API or MCP server.`,
        ],
      },
    ],
    pricing: {
      before: [
        "Billed yearly, Later Starter is $18.75 a month for one social set and one user, Growth $37.50 for two sets and two users, and Scale $82.50 for six sets and four users, with extra sets at $11.25 each. Later says yearly billing saves 25%, and taxes are extra.",
      ],
      tables: [
        {
          caption: `Price a month billed yearly, checked ${checkedText}. aghost includes tax`,
          headings: ["Social sets", "Later", "aghost"],
          rows: [
            ["1", "$18.75 on Starter", `${yearlyPerMonth("pro")} on Pro`],
            ["2", "$37.50 on Growth", `${yearlyPerMonth("growth")} on Growth`],
            [
              "6",
              "$82.50 on Scale",
              `${yearlyPerMonth("business")} on Business`,
            ],
            [
              "10",
              "$127.50 on Scale with 4 extra sets",
              `${yearlyPerMonth("business")} on Business`,
            ],
          ],
        },
      ],
      after: [
        "Later Starter costs less for one brand, though it has no inbox and caps posts. From two brands up, aghost costs less, and every plan includes Instagram DM automation.",
      ],
    },
    switching: [
      "Later's calendar doesn't import into aghost. Connect each account, recreate upcoming posts in aghost, and remove them from Later so nothing publishes twice.",
      "Keep Later, or another tool, for TikTok, Pinterest, Snapchat and Link in Bio.",
    ],
    faqs: [
      {
        question: "Is aghost a Later alternative?",
        answer:
          "Yes, if you post to Instagram, Facebook, LinkedIn, X, Threads or YouTube and want Instagram comments to send DMs. If you need TikTok, Pinterest, Snapchat or Link in Bio, Later covers them and aghost doesn't.",
      },
      {
        question: "Does Later do Instagram DM automation?",
        answer: `Its pricing page lists a social inbox for answering Instagram DMs and comments on Growth and up, but not automated DMs (checked ${checkedText}).`,
      },
      {
        question: "Which is cheaper, Later or aghost?",
        answer: `For one brand, Later Starter at $18.75 a month billed yearly, against ${yearlyPerMonth("pro")} for aghost Pro. For two or more brands, aghost: Growth is ${yearlyPerMonth("growth")} a month billed yearly for two social sets, against $37.50 on Later Growth.`,
      },
    ],
    sources: [{ label: "Later pricing", href: "https://later.com/pricing/" }],
  },
]

export function comparisonPath(comparison: Pick<Comparison, "slug">): string {
  return `/compare/${comparison.slug}`
}

export function getComparison(slug: string): Comparison | undefined {
  return comparisons.find((comparison) => comparison.slug === slug)
}

/** The questions the hub answers, in its FAQ and its structured data. */
export const compareFaqs: Faq[] = [
  {
    question: "What is the best ManyChat alternative for Instagram?",
    answer: `If you also schedule posts, or your contact count makes ManyChat expensive, aghost: comment-to-DM plus scheduling to six platforms for a flat ${monthly("pro")}/month. For a free plan on one account, LinkDM. For an AI agent that answers customers, Chatfuel.`,
  },
  {
    question: "Which scheduler also automates Instagram DMs?",
    answer: `aghost schedules to ${platformNames} and turns Instagram comments into DMs, from ${yearlyPerMonth("pro")} a month billed yearly. Hootsuite automates message and DM responses from its Professional plan, at $199 per user a month. Buffer's and Later's pricing pages list inboxes for replying by hand, not automated DMs (checked ${checkedText}).`,
  },
  {
    question: "What's a cheaper Hootsuite alternative?",
    answer: `For creators and small teams, aghost starts at ${yearlyPerMonth("pro")} a month billed yearly for a whole workspace, against $99 per user a month for Hootsuite Standard. Hootsuite adds listening, approvals and team routing.`,
  },
  {
    question: "Which of these tools work with AI agents?",
    answer:
      "aghost, Buffer, Hootsuite and Chatfuel run official MCP servers. ManyChat has a public API and LinkDM lists API integration on its Enterprise plan. Later's pricing page doesn't list an API or MCP server.",
  },
]
