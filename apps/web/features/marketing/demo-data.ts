import {
  CHANNEL_METRICS,
  PLATFORM_RULES,
  type Account,
  type ChannelMetric,
  type Conversation,
  type InsightMetrics,
  type InsightOverview,
  type InsightPeriod,
  type InsightPoint,
  type InsightPost,
  type InsightPostReport,
  type InsightQuery,
  type InsightReport,
  type Message,
  type Platform,
} from "@workspace/api/contract"
import type { AutomationRow } from "@/features/automations/automation-table"
import type { ChipPost } from "@/features/calendar/month-grid"

// Sample data for the dashboard on the landing page, in the shapes the API
// sends. The dashboard renders in the browser only, so dates count from the
// visitor's today.

type SampleChannel = {
  platform: Platform
  username: string
  displayName: string | null
  followers: number
  /** In 30 days, as are the counts after it. */
  gained: number
  posts: number
  views: number
  engagements: number
}

type SamplePost = {
  /** The day of the month shown; every month has it. */
  day: number
  hour: number
  minute: number
  caption: string
  platforms: Platform[]
  automation?: boolean
}

type SampleConversation = {
  name: string
  /** Minutes since the last message. */
  minutes: number
  unread: number
  messages: [Message["direction"], string][]
}

export type DemoSet = {
  id: string
  name: string
  /** On the previous period, as a fraction. */
  growth: number
  channels: SampleChannel[]
  captions: string[]
  calendar: SamplePost[]
  automations: AutomationRow[]
  inbox: SampleConversation[]
}

export const DEMO_OWNER = "Maya Chen"

/** Content rows per page, as the API sends them. */
const PAGE_SIZE = 20
const DAY = 86_400_000
/** The sample counts are for 30 days; the other periods scale them. */
const SCALE: Record<InsightPeriod, number> = { 7: 0.24, 30: 1, 90: 2.9 }

export const DEMO_SETS: DemoSet[] = [
  {
    id: "northwind",
    name: "Northwind Studio",
    growth: 0.31,
    channels: [
      {
        platform: "instagram",
        username: "northwind.studio",
        displayName: "Northwind Studio",
        followers: 48_216,
        gained: 1_842,
        posts: 18,
        views: 412_380,
        engagements: 23_104,
      },
      {
        platform: "linkedin",
        username: "northwind-studio",
        displayName: "Northwind Studio",
        followers: 6_418,
        gained: 312,
        posts: 9,
        views: 38_540,
        engagements: 1_236,
      },
      {
        platform: "twitter",
        username: "northwind",
        displayName: "Northwind",
        followers: 9_874,
        gained: 205,
        posts: 22,
        views: 54_810,
        engagements: 2_309,
      },
      {
        platform: "youtube",
        username: "northwindstudio",
        displayName: "Northwind Studio",
        followers: 15_302,
        gained: 890,
        posts: 6,
        views: 96_340,
        engagements: 4_871,
      },
    ],
    captions: [
      "Spring drop lookbook",
      "Behind the shoot",
      "Size guide, explained",
      "One shirt, three ways",
      "Weekend restock is live",
      "Meet the team",
      "Linen care 101",
      "Fit check: the Harbor jacket",
      "Colour story: sage",
      "Studio playlist",
    ],
    calendar: [
      {
        day: 2,
        hour: 11,
        minute: 0,
        caption: "New studio, same team",
        platforms: ["instagram", "linkedin"],
      },
      {
        day: 5,
        hour: 9,
        minute: 0,
        caption: "Spring drop lookbook",
        platforms: ["instagram", "linkedin", "twitter"],
        automation: true,
      },
      {
        day: 8,
        hour: 18,
        minute: 30,
        caption: "Behind the shoot",
        platforms: ["youtube", "instagram"],
      },
      {
        day: 10,
        hour: 12,
        minute: 0,
        caption: "Size guide, explained",
        platforms: ["instagram"],
        automation: true,
      },
      {
        day: 13,
        hour: 10,
        minute: 0,
        caption: "Meet the team",
        platforms: ["linkedin"],
      },
      {
        day: 15,
        hour: 19,
        minute: 0,
        caption: "Weekend restock is live",
        platforms: ["instagram", "twitter"],
      },
      {
        day: 17,
        hour: 17,
        minute: 0,
        caption: "One shirt, three ways",
        platforms: ["youtube", "instagram", "twitter"],
      },
      {
        day: 20,
        hour: 9,
        minute: 30,
        caption: "Linen care 101",
        platforms: ["instagram", "linkedin"],
      },
      {
        day: 22,
        hour: 12,
        minute: 0,
        caption: "Fit check: the Harbor jacket",
        platforms: ["instagram"],
        automation: true,
      },
      {
        day: 24,
        hour: 18,
        minute: 0,
        caption: "Colour story: sage",
        platforms: ["instagram", "twitter", "linkedin"],
      },
      {
        day: 27,
        hour: 10,
        minute: 0,
        caption: "Studio playlist",
        platforms: ["youtube"],
      },
      {
        day: 28,
        hour: 9,
        minute: 0,
        caption: "Summer preview",
        platforms: ["instagram", "linkedin", "twitter", "youtube"],
      },
    ],
    automations: [
      {
        id: "northwind-look",
        name: "Lookbook link",
        summary: "Any post · LOOK",
        status: "active",
        dmsSent: 1_284,
        linkClicks: 612,
      },
      {
        id: "northwind-size",
        name: "Size guide",
        summary: "One post · SIZE, FIT",
        status: "active",
        dmsSent: 342,
        linkClicks: 198,
      },
      {
        id: "northwind-restock",
        name: "Restock waitlist",
        summary: "Scheduled post · Any word",
        status: "paused",
        dmsSent: 96,
        linkClicks: 41,
      },
    ],
    inbox: [
      {
        name: "sarah.designs",
        minutes: 2,
        unread: 1,
        messages: [
          [
            "outgoing",
            "Hey! Here's the spring lookbook ✨\nnorthwind.studio/look",
          ],
          ["incoming", "Got it, thank you! 😍"],
        ],
      },
      {
        name: "leo.wears",
        minutes: 18,
        unread: 0,
        messages: [
          [
            "outgoing",
            "Here's the size guide. Most people size up.\nnorthwind.studio/sizes",
          ],
          ["incoming", "Is the linen shirt back on Friday?"],
          ["outgoing", "Yes, 7 PM. You'll be the first to know."],
        ],
      },
      {
        name: "ana.m",
        minutes: 64,
        unread: 0,
        messages: [
          [
            "outgoing",
            "Hey! Here's the spring lookbook ✨\nnorthwind.studio/look",
          ],
        ],
      },
      {
        name: "jordan.fits",
        minutes: 190,
        unread: 0,
        messages: [
          ["incoming", "Do you ship to Canada?"],
          ["outgoing", "We do! 3–5 days, free over $80."],
        ],
      },
    ],
  },
  {
    id: "maya",
    name: "Maya Makes",
    growth: 0.44,
    channels: [
      {
        platform: "instagram",
        username: "maya.makes",
        displayName: "Maya Makes",
        followers: 12_408,
        gained: 618,
        posts: 12,
        views: 186_020,
        engagements: 9_842,
      },
      {
        platform: "facebook",
        username: "mayamakes",
        displayName: "Maya Makes",
        followers: 2_051,
        gained: 40,
        posts: 8,
        views: 9_812,
        engagements: 412,
      },
      {
        platform: "threads",
        username: "maya.makes",
        displayName: "Maya Makes",
        followers: 3_102,
        gained: 210,
        posts: 15,
        views: 21_430,
        engagements: 1_118,
      },
      {
        platform: "youtube",
        username: "mayamakes",
        displayName: "Maya Makes",
        followers: 8_904,
        gained: 340,
        posts: 4,
        views: 64_210,
        engagements: 3_207,
      },
    ],
    captions: [
      "Studio tour",
      "Free preset pack",
      "My morning routine",
      "Q&A recap",
      "Editing a reel in 60 seconds",
      "Gear I actually use",
      "Desk setup",
      "How I plan a week of posts",
    ],
    calendar: [
      {
        day: 3,
        hour: 8,
        minute: 0,
        caption: "Studio tour",
        platforms: ["youtube", "instagram"],
      },
      {
        day: 7,
        hour: 17,
        minute: 0,
        caption: "Free preset pack",
        platforms: ["instagram", "threads", "facebook"],
        automation: true,
      },
      {
        day: 10,
        hour: 9,
        minute: 30,
        caption: "My morning routine",
        platforms: ["threads"],
      },
      {
        day: 14,
        hour: 12,
        minute: 0,
        caption: "Editing a reel in 60 seconds",
        platforms: ["instagram", "facebook"],
      },
      {
        day: 18,
        hour: 10,
        minute: 0,
        caption: "Q&A recap",
        platforms: ["youtube", "facebook", "threads"],
      },
      {
        day: 21,
        hour: 18,
        minute: 0,
        caption: "Gear I actually use",
        platforms: ["instagram", "threads"],
        automation: true,
      },
      {
        day: 25,
        hour: 9,
        minute: 0,
        caption: "How I plan a week of posts",
        platforms: ["instagram", "facebook", "threads", "youtube"],
      },
    ],
    automations: [
      {
        id: "maya-guide",
        name: "Free guide",
        summary: "Any post · GUIDE",
        status: "active",
        dmsSent: 864,
        linkClicks: 431,
      },
      {
        id: "maya-preset",
        name: "Preset pack",
        summary: "One post · PRESET",
        status: "active",
        dmsSent: 215,
        linkClicks: 120,
      },
    ],
    inbox: [
      {
        name: "jules.creates",
        minutes: 5,
        unread: 2,
        messages: [
          ["outgoing", "Here's your free guide 💛\nmayamakes.co/guide"],
          ["incoming", "This is so helpful!"],
          ["incoming", "Will you do one for Lightroom too?"],
        ],
      },
      {
        name: "omar.k",
        minutes: 40,
        unread: 0,
        messages: [
          ["outgoing", "Your presets are ready ✨\nmayamakes.co/presets"],
          ["incoming", "Downloaded, thanks Maya"],
        ],
      },
    ],
  },
]

/** The same uneven spread on every render, between 0.4 and 1. */
function wave(index: number, seed: number) {
  const noise = Math.sin(index * 12.9898 + seed * 78.233) * 43_758.5453
  return 0.4 + 0.6 * (noise - Math.floor(noise))
}

function utcDay(time: number) {
  return new Date(time).toISOString().slice(0, 10)
}

function accountId(set: DemoSet, platform: Platform) {
  return `${set.id}-${platform}`
}

export function accountsOf(set: DemoSet): Account[] {
  return set.channels.map((channel) => ({
    id: accountId(set, channel.platform),
    platform: channel.platform,
    username: channel.username,
    displayName: channel.displayName,
    profilePictureUrl: null,
    status: "connected",
    disconnectReason: null,
    socialSetId: set.id,
    createdAt: "2026-01-05T09:00:00Z",
  }))
}

/** Each metric from views and engagements, null where the platform has none. */
function metricsFor(
  platform: Platform,
  views: number,
  engagements: number
): Record<ChannelMetric, number | null> {
  const values: Record<ChannelMetric, number> = {
    impressions: Math.round(views * 1.45),
    reach: Math.round(views * 0.58),
    views,
    likes: Math.round(engagements * 0.72),
    comments: Math.round(engagements * 0.11),
    shares: Math.round(engagements * 0.09),
    saves: Math.round(engagements * 0.08),
    clicks: Math.round(views * 0.021),
  }
  const reported: readonly ChannelMetric[] = PLATFORM_RULES[platform].metrics
  return Object.fromEntries(
    CHANNEL_METRICS.map((metric) => [
      metric,
      reported.includes(metric) ? values[metric] : null,
    ])
  ) as Record<ChannelMetric, number | null>
}

function range(days: InsightPeriod, now: number, before = 0) {
  return {
    fromDate: utcDay(now - (days - 1 + before) * DAY),
    toDate: utcDay(now - before * DAY),
  }
}

type Overview = Extract<InsightOverview, { status: "ready" }>

export function overviewOf(
  set: DemoSet,
  days: InsightPeriod,
  now: number
): Overview {
  const scale = SCALE[days]
  const channels = set.channels.map((channel) => {
    const views = Math.round(channel.views * scale)
    const engagements = Math.round(channel.engagements * scale)
    return {
      platform: channel.platform,
      accountIds: [accountId(set, channel.platform)],
      followers: channel.followers,
      followersGained: Math.round(channel.gained * scale),
      posts: Math.max(1, Math.round(channel.posts * scale)),
      engagements,
      metrics: metricsFor(channel.platform, views, engagements),
    }
  })
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
  const totals = {
    posts: sum(channels.map((channel) => channel.posts)),
    views: sum(channels.map((channel) => channel.metrics.views ?? 0)),
    engagements: sum(channels.map((channel) => channel.engagements)),
  }
  return {
    status: "ready",
    range: range(days, now),
    previousRange: range(days, now, days),
    followers: sum(channels.map((channel) => channel.followers)),
    followersGained: sum(channels.map((channel) => channel.followersGained)),
    totals,
    previousTotals: {
      posts: Math.round(totals.posts / (1 + set.growth / 3)),
      views: Math.round(totals.views / (1 + set.growth)),
      engagements: Math.round(totals.engagements / (1 + set.growth / 2)),
    },
    channels,
    updatedAt: new Date(now - 4 * 60_000).toISOString(),
  }
}

function postMetrics(
  platform: Platform,
  kind: InsightPost["kind"],
  views: number,
  engagements: number
): InsightMetrics {
  const metrics = metricsFor(platform, views, engagements)
  const engaged =
    (metrics.likes ?? 0) +
    (metrics.comments ?? 0) +
    (metrics.saves ?? 0) +
    (metrics.shares ?? 0)
  const reel = platform === "instagram" && kind === "reel"
  return {
    ...metrics,
    reposts: null,
    engagementRate: metrics.reach
      ? Math.round((engaged / metrics.reach) * 1000) / 10
      : null,
    averageWatchSeconds: reel ? 6.4 : null,
    totalWatchSeconds: reel ? Math.round(views * 6.4) : null,
    skipRate: reel ? 38.5 : null,
  }
}

/** The channel's posts in the period, newest first. */
function postsOf(
  set: DemoSet,
  channel: SampleChannel,
  days: InsightPeriod,
  now: number
): InsightPost[] {
  const scale = SCALE[days]
  const count = Math.max(1, Math.round(channel.posts * scale))
  const seed = set.channels.indexOf(channel) + 1
  const weights = Array.from({ length: count }, (_, index) => wave(index, seed))
  const weight = weights.reduce((a, b) => a + b, 0)
  // Some posts get more engagement for their views than others.
  const rates = weights.map((_, index) => wave(index, seed + 9))
  const rate = rates.reduce((a, b) => a + b, 0) / count
  return weights.map((share, index) => {
    const kind: InsightPost["kind"] =
      channel.platform === "youtube"
        ? "video"
        : channel.platform !== "instagram"
          ? "post"
          : index % 3 === 0
            ? "reel"
            : index % 3 === 1
              ? "carousel"
              : "post"
    const views = Math.round((channel.views * scale * share) / weight)
    const engagements = Math.round(
      (channel.engagements * scale * share * rates[index]!) / (weight * rate)
    )
    return {
      id: `${accountId(set, channel.platform)}-${index}`,
      platformPostId: null,
      caption: set.captions[(index + seed * 3) % set.captions.length]!,
      permalink: null,
      thumbnailUrl: null,
      publishedAt: new Date(
        now - ((index + 0.5) / count) * days * DAY
      ).toISOString(),
      kind,
      metrics: postMetrics(channel.platform, kind, views, engagements),
      updatedAt: new Date(now - 20 * 60_000).toISOString(),
    }
  })
}

/** Each day of the period, from the oldest. */
function daily(
  days: InsightPeriod,
  now: number,
  value: (day: string, index: number) => number
): InsightPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const day = utcDay(now - (days - 1 - index) * DAY)
    return { date: day, value: value(day, index) }
  })
}

type Report = Extract<InsightReport, { status: "ready" }>

export function reportOf(
  set: DemoSet,
  account: Account,
  days: InsightPeriod,
  sort: InsightQuery["sort"],
  page: number,
  now: number
): Report {
  const channel = set.channels.find(
    (item) => item.platform === account.platform
  )!
  const posts = postsOf(set, channel, days, now)
  const sorted =
    sort === "date"
      ? posts
      : [...posts].sort(
          (a, b) => (b.metrics[sort] ?? -1) - (a.metrics[sort] ?? -1)
        )
  const content = {
    status: "ready" as const,
    range: range(days, now),
    posts: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    page,
    pages: Math.ceil(posts.length / PAGE_SIZE),
    totalPosts: posts.length,
    contentUpdatedAt: new Date(now - 20 * 60_000).toISOString(),
  }
  const scale = SCALE[days]
  if (channel.platform === "instagram") {
    const views = Math.round(channel.views * scale)
    const reach = Math.round(views * 0.41)
    const engagements = Math.round(channel.engagements * scale)
    return {
      ...content,
      platform: "instagram",
      summary: {
        views,
        reach,
        accountsEngaged: Math.round(engagements * 0.38),
        totalInteractions: engagements,
      },
      // Climbing through the period, a little different each day.
      dailyReach: daily(days, now, (_, index) =>
        Math.round(
          (reach / days) *
            1.6 *
            (0.7 + (0.3 * index) / days) *
            (0.75 + 0.25 * wave(index, 7))
        )
      ),
    }
  }
  const metric = PLATFORM_RULES[channel.platform].primaryMetric
  const totals = metricsFor(
    channel.platform,
    Math.round(channel.views * scale),
    Math.round(channel.engagements * scale)
  )
  return {
    ...content,
    platform: channel.platform,
    totals,
    postCount: posts.length,
    dailyMetric: metric,
    daily: daily(days, now, (day) =>
      posts
        .filter((post) => post.publishedAt!.slice(0, 10) === day)
        .reduce((total, post) => total + (post.metrics[metric] ?? 0), 0)
    ),
  }
}

/** A post from a report, with its views climbing since it went out. */
export function postReportOf(
  post: InsightPost
): Extract<InsightPostReport, { status: "ready" }> {
  const published = new Date(post.publishedAt!).getTime()
  const now = new Date(post.updatedAt!).getTime()
  const total = post.metrics.views ?? 0
  const length = Math.max(1, Math.ceil((now - published) / DAY))
  return {
    status: "ready",
    post,
    views: Array.from({ length }, (_, index) => ({
      date: utcDay(published + index * DAY),
      value: Math.round(total * (1 - Math.exp(-(index + 1) / 2.5))),
    })),
  }
}

/** The set's posts in a month, one per account they go out on. */
export function calendarOf(set: DemoSet, month: Date, now: number): ChipPost[] {
  return set.calendar.flatMap((post, index) =>
    post.platforms.map((platform) => {
      const when = new Date(
        month.getFullYear(),
        month.getMonth(),
        post.day,
        post.hour,
        post.minute
      )
      return {
        id: `${set.id}-post-${month.getMonth()}-${index}-${platform}`,
        accountId: accountId(set, platform),
        platform,
        kind: "post",
        caption: post.caption,
        media: [],
        scheduledFor: when.toISOString(),
        trialReel: null,
        youtube: null,
        status: when.getTime() < now ? "published" : "scheduled",
        automationIds:
          post.automation && platform === "instagram"
            ? [set.automations[0]!.id]
            : [],
      }
    })
  )
}

type DemoThread = { conversation: Conversation; messages: Message[] }

/** The set's Instagram conversations, the latest first. */
export function inboxOf(set: DemoSet, now: number): DemoThread[] {
  return set.inbox.map((item, index) => {
    const updated = now - item.minutes * 60_000
    const messages = item.messages.map(([direction, text], position) => ({
      id: `${set.id}-message-${index}-${position}`,
      direction,
      text,
      attachments: [],
      createdAt: new Date(
        updated - (item.messages.length - 1 - position) * 3 * 60_000
      ).toISOString(),
    }))
    return {
      conversation: {
        id: `${set.id}-conversation-${index}`,
        instagramAccountId: accountId(set, "instagram"),
        participant: { name: item.name, avatarUrl: null },
        lastMessage: item.messages.at(-1)![1],
        unreadCount: item.unread,
        updatedAt: new Date(updated).toISOString(),
        url: null,
      },
      messages,
    }
  })
}
