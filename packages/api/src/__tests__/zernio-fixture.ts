import { randomBytes, randomUUID } from "node:crypto"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { once } from "node:events"

type Body = Record<string, unknown>
function nextDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}
type RecordedRequest = {
  method: string
  path: string
  query: URLSearchParams
  body: Body
  idempotencyKey?: string
}

/** A local HTTP fixture exercises the real SDK without contacting Instagram. */
export async function startZernioFixture() {
  const profiles = new Map<string, string>()
  const automations = new Map<string, Body>()
  const posts = new Map<string, Body>()
  const requests: RecordedRequest[] = []
  const state = {
    failureStatus: 0,
    outsideProfile: false,
    accountConnected: true,
    inboxAccountsFailed: 0,
    automationLogs: null as Body[] | null,
    // Whether the account granted permission to publish.
    canPost: true,
    canFetchAnalytics: true,
    analyticsFailureStatus: 0,
    analyticsOutsideAccount: false,
    analyticsMissing: false,
    analyticsRequiresAddon: false,
    analyticsTimingSlots: [
      { day_of_week: 2, hour: 13, avg_engagement: 510.3, post_count: 15 },
      { day_of_week: 4, hour: 12, avg_engagement: 342.5, post_count: 12 },
      { day_of_week: 0, hour: 9, avg_engagement: 289.1, post_count: 8 },
    ],
    analyticsPending: false,
    analyticsMediaProductType: "REELS",
    analyticsDailyReach: null as { date: string; value: number }[] | null,
    analyticsViewHistory: null as { date: string; views: number }[] | null,
    // Fails the next automation write only, after other writes succeeded.
    automationFailureStatus: 0,
  }
  const accountId = `fixture-account-${randomUUID()}`
  const postId = "fixture-post-1"
  const conversationId = "fixture/conversation=1"
  // A thread on an account in the profile that no workspace has stored.
  const foreignConversationId = "fixture-conversation-foreign"
  const conversations = [
    {
      id: conversationId,
      accountId,
      participantId: "fixture-participant-1",
      participantName: "Ann Reader",
      participantPicture: "https://example.com/ann.jpg",
      lastMessage: "Thanks!",
      updatedTime: "2026-10-09T12:00:00Z",
      unreadCount: 2,
      url: "https://ig.me/fixture",
    },
    {
      id: foreignConversationId,
      accountId: "fixture-foreign-account",
      participantId: "fixture-participant-2",
      participantName: "Someone Else",
      updatedTime: "2026-10-09T11:00:00Z",
      unreadCount: null,
    },
  ]
  // Oldest first.
  const messages: Body[] = [
    {
      id: "fixture-message-1",
      direction: "incoming",
      message: "GUIDE please",
      createdAt: "2026-10-09T11:58:00Z",
      attachments: [],
    },
    {
      id: "fixture-message-2",
      direction: "outgoing",
      message: "",
      createdAt: "2026-10-09T11:59:00Z",
      attachments: [{ type: "image", url: "https://example.com/guide.png" }],
    },
    {
      id: "fixture-message-3",
      direction: "incoming",
      message: "Thanks!",
      createdAt: "2026-10-09T12:00:00Z",
      attachments: [],
    },
  ]

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost")
    const chunks = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    const text = Buffer.concat(chunks).toString()
    const body: Body = text ? JSON.parse(text) : {}
    const method = req.method ?? "GET"
    requests.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      body,
      idempotencyKey:
        typeof req.headers["idempotency-key"] === "string"
          ? req.headers["idempotency-key"]
          : undefined,
    })
    const reply = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(JSON.stringify(value))
    }
    if (req.headers.authorization !== "Bearer fixture-api-key") {
      reply(401, { error: "Unexpected fixture authorization" })
      return
    }
    if (
      state.failureStatus &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    ) {
      const status = state.failureStatus
      state.failureStatus = 0
      reply(status, { error: "Intentional provider fixture failure" })
      return
    }
    if (url.pathname === "/v1/profiles" && method === "POST") {
      const name = String(body.name)
      const existing = profiles.get(name)
      if (existing)
        reply(409, {
          error: "Profile already exists",
          existingProfileId: existing,
        })
      else {
        const id = `fixture-profile-${randomUUID()}`
        profiles.set(name, id)
        reply(201, { profile: { _id: id, name } })
      }
      return
    }
    if (url.pathname === "/v1/connect/instagram") {
      reply(200, { authUrl: "https://example.com/fixture-oauth" })
      return
    }
    if (url.pathname === "/v1/accounts" && method === "GET") {
      reply(200, {
        accounts: [
          {
            _id: accountId,
            platform: "instagram",
            profileId: state.outsideProfile
              ? "foreign-profile"
              : url.searchParams.get("profileId"),
            username: "fixture_creator",
            displayName: "Fixture Creator",
            isActive: state.accountConnected,
          },
        ],
      })
      return
    }
    if (url.pathname === `/v1/accounts/${accountId}/posts`) {
      reply(200, {
        posts: [
          {
            id: postId,
            message: "Comment GUIDE",
            permalink: "https://instagram.com/p/fixture",
            mediaType: "IMAGE",
            commentCount: 9,
            likeCount: 15,
          },
        ],
      })
      return
    }
    if (url.pathname === `/v1/accounts/${accountId}/health`) {
      reply(200, {
        accountId,
        platform: "instagram",
        permissions: {
          canPost: state.canPost,
          canFetchAnalytics: state.canFetchAnalytics,
        },
      })
      return
    }
    if (url.pathname.startsWith("/v1/analytics")) {
      if (state.analyticsFailureStatus) {
        reply(state.analyticsFailureStatus, {
          error: "Fixture analytics unavailable",
          ...(state.analyticsRequiresAddon && { requiresAddon: true }),
        })
        return
      }
      const fromDate =
        url.searchParams.get("fromDate")?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10)
      const analytics = state.analyticsMissing
        ? {}
        : {
            views: 12_500,
            reach: 8_000,
            likes: 240,
            comments: 32,
            saves: 96,
            shares: 72,
            reposts: 12,
            igReelsAvgWatchTime: 12_500,
            igReelsVideoViewTotalTime: 156_250_000,
            reelsSkipRate: 32.4,
            lastUpdated: new Date().toISOString(),
          }
      const platform = {
        platform: "instagram",
        accountId: state.analyticsOutsideAccount
          ? "foreign-account"
          : accountId,
        platformPostId: postId,
        platformPostUrl: "https://instagram.com/reel/fixture",
        syncStatus: state.analyticsPending ? "pending" : "synced",
        analytics,
      }
      const post = {
        _id: "fixture-analytics-post",
        content: "A closer look at the creative process",
        publishedAt: `${fromDate}T10:00:00.000Z`,
        mediaType: "video",
        mediaProductType: state.analyticsMediaProductType,
        platform: "instagram",
        profileId: url.searchParams.get("profileId"),
        analytics: { views: 999_999 },
        platforms: [platform],
      }
      if (url.pathname === "/v1/analytics/best-time") {
        reply(
          200,
          state.analyticsMissing ? {} : { slots: state.analyticsTimingSlots }
        )
      } else if (url.pathname === "/v1/analytics/instagram/account-insights") {
        reply(200, {
          success: true,
          accountId,
          platform: "instagram",
          metrics: state.analyticsMissing
            ? {}
            : url.searchParams.get("metricType") === "time_series"
              ? {
                  reach: {
                    total: 999_999,
                    values: state.analyticsDailyReach ?? [
                      { date: fromDate, value: 240 },
                      { date: nextDay(fromDate), value: 0 },
                    ],
                  },
                }
              : {
                  views: { total: 24_800 },
                  reach: { total: 13_200 },
                  accounts_engaged: { total: 840 },
                  total_interactions: { total: 1_240 },
                },
        })
      } else if (url.pathname === "/v1/analytics/post-timeline") {
        reply(200, {
          postId: "fixture-analytics-post",
          timeline: state.analyticsViewHistory
            ? state.analyticsViewHistory.map((day) => ({
                ...day,
                platform: "instagram",
                platformPostId: postId,
              }))
            : [
                {
                  date: fromDate,
                  platform: "instagram",
                  platformPostId: postId,
                  views: 120,
                },
                {
                  date: nextDay(fromDate),
                  platform: "instagram",
                  platformPostId: postId,
                  views: 640,
                },
                {
                  date: fromDate,
                  platform: "instagram",
                  platformPostId: "foreign-post",
                  views: 900_000,
                },
                {
                  date: fromDate,
                  platform: "facebook",
                  platformPostId: postId,
                  views: 800_000,
                },
              ],
        })
      } else if (url.searchParams.has("postId")) {
        reply(200, { ...post, postId: post._id, platformAnalytics: [platform] })
      } else {
        reply(200, {
          hasAnalyticsAccess: true,
          overview: { lastSync: new Date().toISOString() },
          posts: [post],
          pagination: { page: 1, pages: 1, total: 1 },
        })
      }
      return
    }
    if (url.pathname === "/v1/media/presign" && method === "POST") {
      const name = String(body.filename)
      reply(200, {
        uploadUrl: `https://storage.example/upload/${name}?signature=fixture`,
        publicUrl: `https://media.example/temp/${name}`,
        key: `temp/${name}`,
        expiresIn: 3600,
      })
      return
    }
    if (url.pathname === "/v1/posts" && method === "POST") {
      // Zernio's ids are 24 hexadecimal characters.
      const id = randomBytes(12).toString("hex")
      const post = { ...body, _id: id, status: "scheduled" }
      posts.set(id, post)
      reply(201, { post })
      return
    }
    const post = url.pathname.match(/^\/v1\/posts\/([^/]+)$/)
    if (post) {
      const id = post[1]!
      const stored = posts.get(id)
      if (!stored) reply(404, { error: "Post not found" })
      else if (method === "PUT") {
        const updated = { ...stored, ...body }
        posts.set(id, updated)
        reply(200, { post: updated })
      } else if (method === "DELETE") {
        posts.delete(id)
        reply(200, { message: "Post deleted" })
      } else reply(200, { post: stored })
      return
    }
    if (url.pathname === `/v1/accounts/${accountId}` && method === "DELETE") {
      state.accountConnected = false
      reply(200, { success: true })
      return
    }
    if (
      state.automationFailureStatus &&
      method !== "GET" &&
      url.pathname.startsWith("/v1/comment-automations")
    ) {
      const status = state.automationFailureStatus
      state.automationFailureStatus = 0
      reply(status, { error: "Intentional automation fixture failure" })
      return
    }
    if (url.pathname === "/v1/comment-automations") {
      if (method === "POST") {
        const id = `fixture-automation-${randomUUID()}`
        automations.set(id, { ...body, id })
        reply(201, { automation: { ...body, id } })
      } else {
        reply(200, {
          automations: [...automations.values()]
            .filter(
              (item) => item.profileId === url.searchParams.get("profileId")
            )
            .map((item) => ({
              ...item,
              stats: { dmsSent: 12, linkClicks: 3 },
            })),
        })
      }
      return
    }
    const match = url.pathname.match(
      /^\/v1\/comment-automations\/([^/]+)(\/logs)?$/
    )
    if (match) {
      const id = match[1]!
      if (!automations.has(id)) {
        reply(404, { error: "Automation not found" })
        return
      }
      if (match[2])
        reply(200, {
          logs: state.automationLogs
            ? state.automationLogs.slice(
                Number(url.searchParams.get("skip") ?? 0),
                Number(url.searchParams.get("skip") ?? 0) +
                  Number(url.searchParams.get("limit") ?? 200)
              )
            : [
                {
                  id: "fixture-log-1",
                  status: "sent",
                  createdAt: "2026-10-09T10:00:00Z",
                  commenterUsername: "fixture_contact",
                  commentText: "GUIDE",
                  clickCount: 1,
                },
              ],
          pagination: {
            total: state.automationLogs?.length ?? 1,
            hasMore: state.automationLogs
              ? Number(url.searchParams.get("skip") ?? 0) +
                  Number(url.searchParams.get("limit") ?? 200) <
                state.automationLogs.length
              : false,
          },
        })
      else if (method === "PATCH") {
        const updated = { ...automations.get(id), ...body }
        automations.set(id, updated)
        reply(200, { automation: updated })
      } else if (method === "DELETE") {
        automations.delete(id)
        reply(200, { success: true })
      } else reply(200, { automation: automations.get(id) })
      return
    }
    if (url.pathname === "/v1/inbox/conversations" && method === "GET") {
      reply(200, {
        data: conversations,
        pagination: { hasMore: false, nextCursor: null },
        meta: {
          accountsQueried: 2,
          accountsFailed: state.inboxAccountsFailed,
          failedAccounts: [],
        },
      })
      return
    }
    const thread = url.pathname.match(
      /^\/v1\/inbox\/conversations\/([^/]+)(\/messages)?$/
    )
    if (thread) {
      const id = decodeURIComponent(thread[1]!)
      const owner =
        method === "POST"
          ? String(body.accountId)
          : url.searchParams.get("accountId")
      const held = conversations.find(
        (item) => item.id === id && item.accountId === owner
      )
      if (!thread[2]) {
        // Like Zernio, answer for any id, echoing the account asked about.
        reply(
          200,
          held
            ? { data: held }
            : {
                data: {
                  id,
                  accountId: owner,
                  platform: "instagram",
                  status: "active",
                  participantPicture: null,
                  participants: [],
                },
              }
        )
      } else if (method === "POST") {
        const messageId = `fixture-message-${randomUUID()}`
        messages.push({
          id: messageId,
          direction: "outgoing",
          message: body.message,
          createdAt: new Date().toISOString(),
          attachments: [],
        })
        reply(200, { success: true, data: { conversationId: id, messageId } })
      } else {
        const sortOrder = url.searchParams.get("sortOrder") ?? "asc"
        const page = held ? [...messages] : []
        reply(200, {
          status: "success",
          messages: sortOrder === "desc" ? page.reverse() : page,
          pagination: { hasMore: false, nextCursor: null },
          sortOrderApplied: sortOrder,
        })
      }
      return
    }
    if (url.pathname === "/v1/contacts" && method === "GET") {
      const contacts = [
        {
          id: "fixture-contact-1",
          name: "Ann Reader",
          avatarUrl: null,
          tags: ["guide"],
          lastMessageSentAt: "2026-10-09T12:05:00Z",
          lastMessageReceivedAt: "2026-10-09T12:00:00Z",
          createdAt: "2026-10-01T09:00:00Z",
          platform: "instagram",
          displayIdentifier: "@ann.reader",
        },
        {
          id: "fixture-contact-2",
          name: "Ben",
          avatarUrl: "https://example.com/ben.jpg",
          tags: [],
          lastMessageSentAt: null,
          lastMessageReceivedAt: "2026-10-08T08:00:00Z",
          createdAt: "2026-10-02T09:00:00Z",
          platform: "instagram",
          displayIdentifier: "ben",
        },
      ]
      const skip = Number(url.searchParams.get("skip"))
      reply(200, {
        success: true,
        contacts,
        pagination: {
          total: 52,
          limit: Number(url.searchParams.get("limit")),
          skip,
          hasMore: skip + contacts.length < 52,
        },
      })
      return
    }
    reply(404, { error: `Unhandled fixture route: ${method} ${url.pathname}` })
  }
  const server = createServer((req, res) => {
    void handle(req, res).catch(() => {
      res.writeHead(500)
      res.end("Fixture failed")
    })
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("Fixture has no TCP address")
  return {
    apiUrl: `http://127.0.0.1:${address.port}`,
    accountId,
    postId,
    conversationId,
    foreignConversationId,
    requests,
    automations,
    messages,
    posts,
    state,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  }
}
