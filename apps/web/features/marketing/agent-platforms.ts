import {
  AUTOMATION_LIMITS,
  FACEBOOK_REEL_SECONDS,
  PLANS,
  PLATFORM_RULES,
  POST_LIMITS,
  TIKTOK_VIDEO_SECONDS,
  TRIAL_DAYS,
  YOUTUBE_SHORT_MAX_SECONDS,
  type Platform,
} from "@workspace/api/contract"
import { price } from "@/features/billing/plan-cards"

// One page per platform, for people and agents looking for that platform's MCP
// server. Limits come from the post contract, so a page can't promise more
// than a post can hold.

type Faq = { question: string; answer: string }

type AgentPlatform = {
  slug: string
  platform: Platform
  /** The H1, such as "Instagram MCP server". */
  heading: string
  title: string
  description: string
  /** What the server does on this platform, in a paragraph that stands alone. */
  answer: string
  formats: string[]
  connect: string
  /** What an agent can do here beyond what it can do everywhere. */
  abilities: string[]
  /** MCP tools used only on this platform. */
  tools: string[]
  prompts: { title: string; prompt: string }[]
  faqs: Faq[]
}

const characters = (count: number) => `${count.toLocaleString("en")} characters`
const startingPrice = price(PLANS.pro.prices.USD.monthly, "USD")

/** What an agent can do on every platform. */
export const sharedAbilities = [
  "Schedule a post here and on your other channels in one request, with its own caption for each",
  "Edit, reschedule or cancel a post before it publishes",
  "Read account and post analytics for the last 7, 30 or 90 days",
  "Suggest posting times from the account's history",
]

/** The MCP tools an agent uses on every platform. */
export const sharedTools = [
  "list_accounts",
  "cross_post",
  "list_scheduled_posts",
  "update_scheduled_post",
  "delete_scheduled_post",
  "create_media_upload",
  "create_upload_link",
  "get_account_insights",
  "list_content_insights",
  "get_posting_times",
]

/** Each platform's captions, media and metrics, as the post contract has them. */
export function platformLimits(platform: Platform) {
  const rules = PLATFORM_RULES[platform]
  const media = rules.videoOnly
    ? "One video"
    : rules.mixesMedia
      ? `Up to ${rules.maxMedia} photos and videos`
      : `Up to ${rules.maxMedia} photos, or one video`
  return [
    {
      name: rules.titleMaxLength ? "Description" : "Caption",
      value: characters(rules.captionMaxLength),
    },
    ...(rules.titleMaxLength
      ? [{ name: "Title", value: characters(rules.titleMaxLength) }]
      : []),
    { name: "Media", value: media },
    {
      name: "Text-only posts",
      value: rules.needsMedia ? "No" : "Yes",
    },
    { name: "Metrics", value: rules.metrics.join(", ") },
  ]
}

const sharedFaqs: Faq[] = [
  {
    question: "Which AI agents can use it?",
    answer:
      "Claude, Claude Code, Codex, Cursor, or any MCP client over HTTP. Apps with MCP sign-in need only the URL; other clients send a workspace API key.",
  },
  {
    question: "How much does it cost?",
    answer: `MCP access is included on every aghost plan, from ${startingPrice}/month, with a ${TRIAL_DAYS}-day free trial.`,
  },
]

const platforms: AgentPlatform[] = [
  {
    slug: "instagram",
    platform: "instagram",
    heading: "Instagram MCP server",
    title: "Instagram MCP server: posts, Reels and DM automations",
    description:
      "Let Claude, Codex or Cursor schedule Instagram posts, Reels, Stories and Trial Reels, run comment-to-DM automations and read analytics over MCP.",
    answer:
      "aghost's Instagram MCP server lets Claude, Codex, Cursor or another MCP client schedule Instagram posts, carousels, Reels, Stories and Trial Reels. It can attach a comment-to-DM automation to a post before it publishes, reply in the inbox and read analytics. The same connection posts to six other platforms.",
    formats: [
      `Photo posts and carousels of up to ${PLATFORM_RULES.instagram.maxMedia} photos and videos`,
      "Reels from one video",
      "Stories with one photo or video",
      "Trial Reels, shown to non-followers first",
    ],
    connect:
      "Connect with Instagram's own sign-in; aghost never asks for your password. Comment automations and the inbox need a Business or Creator account.",
    abilities: [
      `Attach a comment-to-DM automation to a post before it publishes: up to ${AUTOMATION_LIMITS.maxKeywords} keywords or any comment, a public reply, and up to ${AUTOMATION_LIMITS.maxDmButtons} link buttons`,
      "Ask non-followers to follow before they get the link",
      "Read automation stats and the log of every DM",
      "Read and reply to Instagram DM conversations",
    ],
    tools: [
      "schedule_post",
      "create_automation",
      "update_automation",
      "set_automation_status",
      "get_automation_stats",
      "list_automation_activity",
      "list_conversations",
      "send_message",
      "list_contacts",
    ],
    prompts: [
      {
        title: "Schedule a reel with its DM",
        prompt:
          "Schedule my reel for Friday at 6 PM and DM my guide to anyone who comments GUIDE. Show me the caption, time and DM first.",
      },
      {
        title: "Test a reel on new viewers",
        prompt:
          "Post this video as a Trial Reel tomorrow at 9 AM and let Instagram share it with my followers if it does well with non-followers.",
      },
      {
        title: "Find what worked",
        prompt:
          "Which of my posts from the last 30 days got the most saves and shares? Suggest two times to post next week.",
      },
    ],
    faqs: [
      {
        question: "Can my agent DM anyone on Instagram?",
        answer:
          "No. Instagram allows one private reply to each comment within seven days, and more messages only after the person responds. Automations and inbox replies follow those rules.",
      },
      {
        question: "Can it schedule Stories and carousels?",
        answer: `Yes. A story holds one photo or video and has no caption or comments. A carousel holds up to ${PLATFORM_RULES.instagram.maxMedia} photos and videos; the first is its cover.`,
      },
      {
        question: "Does aghost need my Instagram password?",
        answer:
          "No. Accounts connect through Instagram's own authorization flow, and you can disconnect them in Settings.",
      },
    ],
  },
  {
    slug: "facebook",
    platform: "facebook",
    heading: "Facebook MCP server",
    title: "Facebook MCP server: schedule Page posts and Reels",
    description:
      "Let Claude, Codex or Cursor schedule Facebook Page posts and Reels, cross-post to six more platforms and read Page analytics over MCP.",
    answer:
      "aghost's Facebook MCP server lets Claude, Codex, Cursor or another MCP client schedule posts and Reels on your Facebook Page, edit them before they publish and read their analytics. One request can post the same update to Instagram, LinkedIn, X, Threads, YouTube and TikTok, each with its own caption.",
    formats: [
      "Text posts",
      `Up to ${PLATFORM_RULES.facebook.maxMedia} photos in a post, or one video`,
      `Reels from one vertical video of ${FACEBOOK_REEL_SECONDS.min} to ${FACEBOOK_REEL_SECONDS.max} seconds`,
    ],
    connect: "A Facebook Page. You choose the Page while connecting.",
    abilities: [],
    tools: [],
    prompts: [
      {
        title: "Post a Reel to your Page",
        prompt:
          "Schedule this vertical video as a Facebook Reel on my Page for Saturday at 10 AM, with the same caption as Instagram.",
      },
      {
        title: "Share one update everywhere",
        prompt:
          "Post this photo and announcement to Facebook, LinkedIn and X tomorrow at 9 AM. Keep the X version under 280 characters.",
      },
      {
        title: "Find your best posts",
        prompt:
          "Which of my Facebook posts from the last 30 days got the most clicks, and what time were they posted?",
      },
    ],
    faqs: [
      {
        question: "Can my agent post to Facebook and Instagram at once?",
        answer:
          "Yes. One request schedules both, with a caption for each. Every copy is checked against its platform first, and either all are scheduled or none are.",
      },
      {
        question: "How does a video become a Facebook Reel?",
        answer: `Ask for a Reel. It needs one vertical video of ${FACEBOOK_REEL_SECONDS.min} to ${FACEBOOK_REEL_SECONDS.max} seconds, or it fails when it publishes. Without the Reel setting, a video publishes as a feed post.`,
      },
      {
        question: "Can my agent answer Facebook comments or Messenger?",
        answer:
          "No. Comment-to-DM automations, the inbox and contacts are for Instagram.",
      },
    ],
  },
  {
    slug: "linkedin",
    platform: "linkedin",
    heading: "LinkedIn MCP server",
    title: "LinkedIn MCP server: schedule posts from your AI agent",
    description:
      "Let Claude, Codex or Cursor schedule LinkedIn posts to your profile or company page, cross-post to six more platforms and read analytics over MCP.",
    answer:
      "aghost's LinkedIn MCP server lets Claude, Codex, Cursor or another MCP client schedule posts to your LinkedIn profile or company page, edit them before they publish and read impressions, engagement and clicks. One request can post the same update to Instagram, Facebook, X, Threads, YouTube and TikTok, each with its own caption.",
    formats: [
      `Text posts up to ${characters(PLATFORM_RULES.linkedin.captionMaxLength)}`,
      `Up to ${PLATFORM_RULES.linkedin.maxMedia} photos in a post, or one video`,
    ],
    connect:
      "A personal profile or an organization page. You choose it while connecting.",
    abilities: [],
    tools: [],
    prompts: [
      {
        title: "Turn an announcement into a post",
        prompt:
          "Rewrite this announcement for LinkedIn and schedule it for Tuesday at 8 AM with these three photos. Show me the post first.",
      },
      {
        title: "Plan the week",
        prompt:
          "Schedule these five posts on LinkedIn and X, one each weekday at 9 AM. Give the X copies their own shorter captions.",
      },
      {
        title: "Find what worked",
        prompt:
          "Which LinkedIn posts from the last 90 days got the most impressions and comments? What do they have in common?",
      },
    ],
    faqs: [
      {
        question: "Can my agent post to a LinkedIn company page?",
        answer:
          "Yes. Connect an organization page instead of a personal profile.",
      },
      {
        question: "Can it post PDF document carousels?",
        answer: "No. Posts take JPEG or PNG photos, or one MP4 or MOV video.",
      },
      {
        question: "Which LinkedIn metrics can my agent read?",
        answer:
          "Impressions, reach, views, likes, comments, shares, saves and clicks. LinkedIn reports saves for personal profiles only and clicks for organization pages only.",
      },
    ],
  },
  {
    slug: "x",
    platform: "twitter",
    heading: "X (Twitter) MCP server",
    title: "X (Twitter) MCP server: schedule posts from your AI agent",
    description:
      "Let Claude, Codex or Cursor schedule X posts with photos or video, cross-post to six more platforms and read impressions and clicks over MCP.",
    answer:
      "aghost's X MCP server lets Claude, Codex, Cursor or another MCP client schedule posts on X, with photos or a video, edit them before they publish and read impressions and clicks. One request can post the same update to Instagram, Facebook, LinkedIn, Threads, YouTube and TikTok, with a shorter caption for X.",
    formats: [
      `Text posts up to ${characters(PLATFORM_RULES.twitter.captionMaxLength)}`,
      `Up to ${PLATFORM_RULES.twitter.maxMedia} photos, or one video`,
    ],
    connect: "An X account.",
    abilities: [],
    tools: [],
    prompts: [
      {
        title: "Cut it to fit",
        prompt:
          "Turn this blog post into an X post under 280 characters and schedule it for 2 PM today with the cover image.",
      },
      {
        title: "Plan the week",
        prompt:
          "Schedule one post a day on X next week at 1 PM from these notes. Show me all five before scheduling.",
      },
      {
        title: "Read the numbers",
        prompt:
          "Which of my X posts this month got the most impressions and link clicks?",
      },
    ],
    faqs: [
      {
        question: "Can my agent post more than 280 characters?",
        answer: `No. X accepts longer posts only from paid accounts, so posts here stay within ${characters(PLATFORM_RULES.twitter.captionMaxLength)}.`,
      },
      {
        question: "Can it post threads?",
        answer: "No. Each scheduled X post is a single post.",
      },
      {
        question: "Can my agent read or send X DMs?",
        answer: "No. The inbox and DM automations are for Instagram.",
      },
    ],
  },
  {
    slug: "threads",
    platform: "threads",
    heading: "Threads MCP server",
    title: "Threads MCP server: schedule posts from your AI agent",
    description:
      "Let Claude, Codex or Cursor schedule Threads posts, cross-post from Instagram and read views and engagement over MCP.",
    answer:
      "aghost's Threads MCP server lets Claude, Codex, Cursor or another MCP client schedule Threads posts with text, photos or videos, edit them before they publish and read views and engagement. One request can post the same update to Instagram, Facebook, LinkedIn, X, YouTube and TikTok, each with its own caption.",
    formats: [
      `Text posts up to ${characters(PLATFORM_RULES.threads.captionMaxLength)}`,
      `Up to ${PLATFORM_RULES.threads.maxMedia} photos and videos in a post`,
    ],
    connect: "A Threads account.",
    abilities: [],
    tools: [],
    prompts: [
      {
        title: "Share a reel on Threads",
        prompt:
          "Schedule this reel on Instagram and Threads tonight at 7 PM. Shorten the Threads caption to under 500 characters.",
      },
      {
        title: "Queue a week of posts",
        prompt:
          "Schedule these seven text posts on Threads, one a day at 8 AM starting tomorrow.",
      },
      {
        title: "Find what worked",
        prompt:
          "Which of my Threads posts from the last 30 days got the most views and shares?",
      },
    ],
    faqs: [
      {
        question: "Can my agent post to Threads and Instagram at once?",
        answer:
          "Yes. One request schedules both, with a caption for each. A DM automation applies to the Instagram copy only.",
      },
      {
        question: "Can it schedule text-only Threads posts?",
        answer: "Yes. A Threads post can be text alone.",
      },
      {
        question: "Which Threads metrics can my agent read?",
        answer: "Impressions, views, likes, comments and shares.",
      },
    ],
  },
  {
    slug: "youtube",
    platform: "youtube",
    heading: "YouTube MCP server",
    title: "YouTube MCP server: schedule videos and Shorts",
    description:
      "Let Claude, Codex or Cursor schedule YouTube videos and Shorts with titles, cross-post to six more platforms and read views over MCP.",
    answer:
      "aghost's YouTube MCP server lets Claude, Codex, Cursor or another MCP client schedule YouTube videos and Shorts with a title and description, edit them before they publish and read views and engagement. One request can post the same video to Instagram, Facebook, LinkedIn, X, Threads and TikTok, each with its own caption.",
    formats: [
      `One video per post, with a title of up to ${characters(PLATFORM_RULES.youtube.titleMaxLength!)}`,
      `Shorts: vertical or square videos of up to ${YOUTUBE_SHORT_MAX_SECONDS / 60} minutes`,
    ],
    connect:
      "The YouTube channel of the Google account you choose. A social set holds one channel.",
    abilities: [],
    tools: [],
    prompts: [
      {
        title: "Turn a reel into a Short",
        prompt:
          "Schedule this reel as a YouTube Short too, Friday at 6 PM. Title it “How we planned a month of posts in an hour” and mark it not made for kids.",
      },
      {
        title: "Upload with a teaser",
        prompt:
          "Schedule my video for Sunday at 5 PM with this title and description, and post a teaser on Instagram and X an hour earlier.",
      },
      {
        title: "Read the numbers",
        prompt:
          "Which of my YouTube videos from the last 90 days got the most views and comments?",
      },
    ],
    faqs: [
      {
        question: "Can my agent upload YouTube Shorts?",
        answer: `Yes. A vertical or square video of up to ${YOUTUBE_SHORT_MAX_SECONDS / 60} minutes publishes as a Short.`,
      },
      {
        question: "What does every YouTube video need?",
        answer: `A title of up to ${characters(PLATFORM_RULES.youtube.titleMaxLength!)} and YouTube's audience setting: whether the video is made for kids.`,
      },
      {
        question: "Can it post images or community posts?",
        answer: "No. Each YouTube post here is one video.",
      },
    ],
  },
  {
    slug: "tiktok",
    platform: "tiktok",
    heading: "TikTok MCP server",
    title: "TikTok MCP server: schedule videos and photo posts",
    description:
      "Let Claude, Codex or Cursor schedule TikTok videos and photo posts, cross-post to six more platforms and read views and engagement over MCP.",
    answer:
      "aghost's TikTok MCP server lets Claude, Codex, Cursor or another MCP client schedule TikTok videos and photo posts with the audience and interactions you choose, edit them before they publish and read views and engagement. One request can post the same video to Instagram, Facebook, LinkedIn, X, Threads and YouTube, each with its own caption.",
    formats: [
      `Videos of ${TIKTOK_VIDEO_SECONDS.min} seconds to ${TIKTOK_VIDEO_SECONDS.max / 60} minutes, or the account's own limit`,
      `Photo posts of up to ${PLATFORM_RULES.tiktok.maxMedia} photos`,
    ],
    connect:
      "A TikTok account, connected with TikTok's own sign-in. You choose the account while connecting.",
    abilities: [
      "Read who can see the account's posts, and whether it allows comments, duets and stitches",
      "Set each post's audience and interactions, as you choose them",
      "Label a post as promoting your own brand or as a paid partnership",
    ],
    tools: ["get_tiktok_creator"],
    prompts: [
      {
        title: "Post a reel on TikTok too",
        prompt:
          "Schedule this video on Instagram and TikTok for Friday at 6 PM. On TikTok, allow comments and duets but not stitches. Show me both captions first.",
      },
      {
        title: "Share a photo post",
        prompt:
          "Post these five photos to TikTok tomorrow at noon for my followers only, with comments on.",
      },
      {
        title: "Find what worked",
        prompt:
          "Which of my TikTok videos from the last 30 days got the most views and shares?",
      },
    ],
    faqs: [
      {
        question: "Can my agent post private TikTok videos?",
        answer:
          "No. Videos publish to everyone. A photo post can be shown to friends, followers or only you, where the account allows it.",
      },
      {
        question: "Does my agent pick who can see a post?",
        answer:
          "No. TikTok has no defaults for a post's audience or interactions, so your agent asks you who can see it and whether to allow comments, duets and stitches. Anything you turned off in TikTok stays off.",
      },
      {
        question: "Can my agent answer TikTok comments or DMs?",
        answer:
          "No. Comment-to-DM automations, the inbox and contacts are for Instagram.",
      },
    ],
  },
]

export const agentPlatforms = platforms.map((page) => ({
  ...page,
  faqs: [...page.faqs, ...sharedFaqs],
}))

export function getAgentPlatform(slug: string) {
  return agentPlatforms.find((page) => page.slug === slug)
}

export const agentPlatformPath = (page: { slug: string }) =>
  `/agents/${page.slug}`

/** Media every platform accepts, and how far ahead a post is scheduled. */
export const mediaRules = `JPEG or PNG photos up to ${POST_LIMITS.imageMaxBytes / 1024 / 1024} MB and MP4 or MOV videos up to ${POST_LIMITS.videoMaxBytes / 1024 / 1024} MB, scheduled at least ${POST_LIMITS.minLeadMinutes} minutes ahead.`
