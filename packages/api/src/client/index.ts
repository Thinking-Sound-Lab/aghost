import {
  apiErrorBodySchema,
  type ApiErrorCode,
  type Automation,
  type AutomationActivityPage,
  type AutomationStatsById,
  type ConnectInstagramResult,
  type CompleteUploadLinkInput,
  type ContactPage,
  type Conversation,
  type CreateAutomationInput,
  type ApiKey,
  type CreateApiKeyInput,
  type CreatedApiKey,
  type InstagramAccount,
  type InstagramPost,
  type IntegrationStatus,
  type InsightQuery,
  type InsightReport,
  type InsightPostQuery,
  type InsightPostReport,
  type InsightTimingReport,
  type InsightContentReport,
  type MediaContentType,
  type MediaUpload,
  type Message,
  type PostMedia,
  type PublishingAccess,
  type ScheduledPost,
  type ScheduledPostRange,
  type SchedulePostInput,
  type UpdateScheduledPostInput,
  type UploadLink,
  type SendMessageInput,
  type SessionUser,
  type UpdateAutomationInput,
  type Workspace,
  type BillingState,
  type BillingRedirect,
  type ChoosePlanInput,
  type PlanChangeResult,
  type AuthorizationRequest,
  type AuthorizationDecision,
} from "../contract"

export class ApiClientError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

export function createApiClient(
  baseUrl: string,
  transport: typeof fetch = fetch
) {
  async function request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    format: "json" | "markdown" = "json"
  ): Promise<T> {
    // Proxies can frame an empty DELETE as chunked. Give Fastify JSON to parse.
    const requestBody = body === undefined && method === "DELETE" ? {} : body
    let response: Response
    try {
      response = await transport(`${baseUrl}${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        ...(requestBody !== undefined && {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }),
      })
    } catch {
      throw new ApiClientError(
        "internal_error",
        "Could not reach the server. Check your connection and try again."
      )
    }
    if (response.ok && response.status === 204) return undefined as T
    let payload: unknown
    try {
      if (response.ok && format === "markdown") {
        if (!response.headers.get("Content-Type")?.startsWith("text/markdown"))
          throw new Error("Expected Markdown")
        return (await response.text()) as T
      }
      payload = await response.json()
    } catch {
      throw new ApiClientError(
        "internal_error",
        "The server returned an unexpected response."
      )
    }
    if (!response.ok) {
      const parsed = apiErrorBodySchema.safeParse(payload)
      if (!parsed.success)
        throw new ApiClientError(
          "internal_error",
          "The server returned an unexpected response."
        )
      const { code, message, fields } = parsed.data.error
      throw new ApiClientError(code, message, fields)
    }
    return payload as T
  }
  return {
    mcp: {
      skill: () =>
        request<string>("/mcp/skill.md", "GET", undefined, "markdown"),
    },
    apiKeys: {
      list: () => request<ApiKey[]>("/api-keys"),
      create: (input: CreateApiKeyInput = {}) =>
        request<CreatedApiKey>("/api-keys", "POST", input),
      revoke: (id: string) =>
        request<void>(`/api-keys/${encodeURIComponent(id)}`, "DELETE"),
    },
    auth: {
      /** Where to send the browser to sign in with Google. */
      googleSignInUrl: `${baseUrl}/auth/google`,
      session: () => request<{ user: SessionUser }>("/auth/session"),
      signOut: () => request<void>("/auth/sign-out", "POST", {}),
    },
    oauth: {
      request: (id: string) =>
        request<AuthorizationRequest>(
          `/oauth/requests/${encodeURIComponent(id)}`
        ),
      approve: (id: string) =>
        request<AuthorizationDecision>(
          `/oauth/requests/${encodeURIComponent(id)}/approve`,
          "POST",
          {}
        ),
      deny: (id: string) =>
        request<AuthorizationDecision>(
          `/oauth/requests/${encodeURIComponent(id)}/deny`,
          "POST",
          {}
        ),
    },
    workspace: {
      get: () => request<Workspace>("/workspace"),
      rename: (name: string) =>
        request<Workspace>("/workspace", "PATCH", { name }),
    },
    integrations: () => request<IntegrationStatus>("/integrations"),
    billing: {
      get: () => request<BillingState>("/billing"),
      sync: () => request<BillingState>("/billing/sync", "POST", {}),
      checkout: (choice: ChoosePlanInput) =>
        request<BillingRedirect>("/billing/checkout", "POST", choice),
      changePlan: (choice: ChoosePlanInput) =>
        request<PlanChangeResult>("/billing/plan", "POST", choice),
      portal: () => request<BillingRedirect>("/billing/portal", "POST", {}),
    },
    accounts: {
      list: () => request<InstagramAccount[]>("/accounts"),
      connect: () =>
        request<ConnectInstagramResult>("/accounts/connect", "POST", {}),
      sync: () => request<InstagramAccount[]>("/accounts/sync", "POST", {}),
      reconnect: (id: string) =>
        request<ConnectInstagramResult>(
          `/accounts/${encodeURIComponent(id)}/reconnect`,
          "POST",
          {}
        ),
      publishing: (id: string) =>
        request<PublishingAccess>(
          `/accounts/${encodeURIComponent(id)}/publishing`
        ),
      posts: (id: string) =>
        request<InstagramPost[]>(`/accounts/${encodeURIComponent(id)}/posts`),
      remove: (id: string) =>
        request<void>(`/accounts/${encodeURIComponent(id)}`, "DELETE"),
    },
    automations: {
      list: () => request<Automation[]>("/automations"),
      get: (id: string) =>
        request<Automation>(`/automations/${encodeURIComponent(id)}`),
      stats: () => request<AutomationStatsById>("/automations/stats"),
      create: (input: CreateAutomationInput) =>
        request<Automation>("/automations", "POST", input),
      update: (id: string, input: UpdateAutomationInput) =>
        request<Automation>(
          `/automations/${encodeURIComponent(id)}`,
          "PATCH",
          input
        ),
      status: (id: string, status: Automation["status"]) =>
        request<Automation>(
          `/automations/${encodeURIComponent(id)}/status`,
          "PATCH",
          { status }
        ),
      remove: (id: string) =>
        request<void>(`/automations/${encodeURIComponent(id)}`, "DELETE"),
      activity: (id: string, offset = 0) =>
        request<AutomationActivityPage>(
          `/automations/${encodeURIComponent(id)}/activity?limit=25&offset=${offset}`
        ),
    },
    insights: {
      content: (query: InsightQuery) =>
        request<InsightContentReport>(
          `/insights/content?${new URLSearchParams({
            accountId: query.accountId,
            days: String(query.days),
            page: String(query.page),
            sort: query.sort,
          })}`
        ),
      postingTimes: (accountId: string) =>
        request<InsightTimingReport>(
          `/insights/posting-times?${new URLSearchParams({ accountId })}`
        ),
      get: (query: InsightQuery) =>
        request<InsightReport>(
          `/insights?${new URLSearchParams({
            accountId: query.accountId,
            days: String(query.days),
            page: String(query.page),
            sort: query.sort,
          })}`
        ),
      post: (id: string, query: InsightPostQuery) =>
        request<InsightPostReport>(
          `/insights/posts/${encodeURIComponent(id)}?${new URLSearchParams({
            accountId: query.accountId,
            days: String(query.days),
          })}`
        ),
    },
    scheduledPosts: {
      list: (range: ScheduledPostRange) =>
        request<ScheduledPost[]>(
          `/scheduled-posts?${new URLSearchParams(range)}`
        ),
      get: (id: string) =>
        request<ScheduledPost>(`/scheduled-posts/${encodeURIComponent(id)}`),
      create: (input: SchedulePostInput) =>
        request<ScheduledPost>("/scheduled-posts", "POST", input),
      update: (id: string, input: UpdateScheduledPostInput) =>
        request<ScheduledPost>(
          `/scheduled-posts/${encodeURIComponent(id)}`,
          "PATCH",
          input
        ),
      remove: (id: string) =>
        request<void>(`/scheduled-posts/${encodeURIComponent(id)}`, "DELETE"),
    },
    media: {
      /** Uploads the file straight to storage and returns it ready to post. */
      upload: async (file: File): Promise<PostMedia> => {
        const upload = await request<MediaUpload>("/media/uploads", "POST", {
          filename: file.name,
          contentType: file.type as MediaContentType,
          size: file.size,
        })
        let response: Response
        try {
          response = await transport(upload.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          })
        } catch {
          throw new ApiClientError(
            "internal_error",
            `Could not upload ${file.name}. Check your connection and try again.`
          )
        }
        if (!response.ok)
          throw new ApiClientError(
            "provider_error",
            `Could not upload ${file.name}. Try again.`
          )
        return upload.media
      },
    },
    uploadLinks: {
      get: (id: string) =>
        request<UploadLink>(`/upload-links/${encodeURIComponent(id)}`),
      /** Hands the uploaded files to the agent that asked for them. */
      complete: (id: string, input: CompleteUploadLinkInput) =>
        request<UploadLink>(
          `/upload-links/${encodeURIComponent(id)}/complete`,
          "POST",
          input
        ),
    },
    inbox: {
      list: () => request<Conversation[]>("/inbox"),
      messages: (accountId: string, conversationId: string) =>
        request<Message[]>(
          `/inbox/${encodeURIComponent(accountId)}/${encodeURIComponent(conversationId)}`
        ),
      send: (
        accountId: string,
        conversationId: string,
        input: SendMessageInput
      ) =>
        request<void>(
          `/inbox/${encodeURIComponent(accountId)}/${encodeURIComponent(conversationId)}`,
          "POST",
          input
        ),
    },
    contacts: {
      list: (search: string, offset = 0) =>
        request<ContactPage>(
          `/contacts?${new URLSearchParams({ search, offset: String(offset) })}`
        ),
    },
  }
}
