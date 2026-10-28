import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
} from "@workspace/supabase/server"

import type { ApiConfig } from "./config"
import { createApp, type ApiApp } from "./http/app"
import type { Authenticate, AuthenticateAgent } from "./http/context"
import { DodoBillingProvider } from "./infrastructure/dodo/dodo-billing.provider"
import {
  createDodoClient,
  type DodoClient,
} from "./infrastructure/dodo/dodo-client"
import { DodoWebhookGateway } from "./infrastructure/dodo/dodo-webhook.gateway"
import { PostHogAnalytics } from "./infrastructure/posthog/posthog-analytics"
import type { DataClients } from "./infrastructure/supabase/data-clients"
import { SupabaseSocialSetRepository } from "./infrastructure/supabase/supabase-social-set.repository"
import { SupabaseAccountRepository } from "./infrastructure/supabase/supabase-account.repository"
import { SupabaseApiKeyRepository } from "./infrastructure/supabase/supabase-api-key.repository"
import { SupabaseOAuthRepository } from "./infrastructure/supabase/supabase-oauth.repository"
import { SupabaseAutomationRepository } from "./infrastructure/supabase/supabase-automation.repository"
import { SupabaseBillingRepository } from "./infrastructure/supabase/supabase-billing.repository"
import { SupabasePostRepository } from "./infrastructure/supabase/supabase-post.repository"
import { SupabaseUploadLinkRepository } from "./infrastructure/supabase/supabase-upload-link.repository"
import { SupabaseWebhookProcessor } from "./infrastructure/supabase/supabase-webhook.processor"
import { SupabaseWorkspaceRepository } from "./infrastructure/supabase/supabase-workspace.repository"
import { SupabaseWorkspaceOperations } from "./infrastructure/supabase/supabase-workspace-operations"
import { SupabaseBillingReconciliation } from "./infrastructure/supabase/supabase-billing-reconciliation"
import { ZernioAutomationProvider } from "./infrastructure/zernio/zernio-automation.provider"
import { createZernioClient } from "./infrastructure/zernio/zernio-client"
import { ZernioContactProvider } from "./infrastructure/zernio/zernio-contact.provider"
import { ZernioInboxProvider } from "./infrastructure/zernio/zernio-inbox.provider"
import { ZernioAccountProvider } from "./infrastructure/zernio/zernio-account.provider"
import { ZernioPublishingProvider } from "./infrastructure/zernio/zernio-post.provider"
import { ZernioProfileProvider } from "./infrastructure/zernio/zernio-profile.provider"
import { ZernioWebhookGateway } from "./infrastructure/zernio/zernio-webhook.gateway"
import { AccountService } from "./modules/accounts/account.service"
import {
  DISABLED_ANALYTICS,
  type Analytics,
  type ProductAnalytics,
} from "./modules/analytics/analytics"
import { ApiKeyService } from "./modules/api-keys/api-key.service"
import type { AccountProvider } from "./modules/accounts/account.provider"
import type { AutomationProvider } from "./modules/automations/automation.provider"
import { AutomationService } from "./modules/automations/automation.service"
import { BillingWebhookService } from "./modules/billing/billing-webhook"
import type { BillingProvider } from "./modules/billing/billing.provider"
import {
  BillingService,
  type BillingPages,
} from "./modules/billing/billing.service"
import { PlanEntitlements } from "./modules/billing/plan-entitlements"
import type { ContactProvider } from "./modules/contacts/contact.provider"
import { ContactService } from "./modules/contacts/contact.service"
import type { InboxProvider } from "./modules/inbox/inbox.provider"
import { InboxService } from "./modules/inbox/inbox.service"
import { oauthEndpoints } from "./modules/oauth/oauth"
import type { PublishingProvider } from "./modules/posts/post.provider"
import { PostService } from "./modules/posts/post.service"
import { UploadLinkService } from "./modules/posts/upload-link.service"
import { OAuthService } from "./modules/oauth/oauth.service"
import { WebhookService } from "./modules/webhooks/webhook.service"
import type { ProfileProvider } from "./modules/workspaces/profile.provider"
import { WorkspaceService } from "./modules/workspaces/workspace.service"
import { InvalidApiKeyError, UnauthenticatedError } from "./shared/errors"
import { SupabaseFollowUpRepository } from "./infrastructure/supabase/supabase-follow-up.repository"
import { ZernioFollowUpProvider } from "./infrastructure/zernio/zernio-follow-up.provider"
import { FollowUpService } from "./modules/automations/follow-up.service"
import { InsightsService } from "./modules/insights/insights.service"
import { SocialSetService } from "./modules/social-sets/social-set.service"
import type { InsightsProvider } from "./modules/insights/insights.provider"
import { ZernioInsightsProvider } from "./infrastructure/zernio/zernio-insights.provider"

// Path of the page in the web app that finishes connecting an account.
const CONNECT_CALLBACK_PATH = "/accounts/callback"
// Where checkout and the billing portal send the browser back to.
const BILLING_PATH = "/settings#billing"

export type Services = {
  apiKeys: ApiKeyService
  workspaces: WorkspaceService
  accounts: AccountService
  automations: AutomationService
  posts: PostService
  uploadLinks: UploadLinkService
  inbox: InboxService
  contacts: ContactService
  insights: InsightsService
  socialSets: SocialSetService
  billing: BillingService
  plans: PlanEntitlements
  /** Records events with the source of the request these services serve. */
  analytics: ProductAnalytics
}

type Providers = {
  profiles: ProfileProvider
  accounts: AccountProvider
  automations: AutomationProvider
  publishing: PublishingProvider
  inbox: InboxProvider
  contacts: ContactProvider
  insights: InsightsProvider
  billing: BillingProvider
}

/**
 * Addresses in the web app: the pages providers send the browser back to, and
 * the app itself, for links that agents give the owner.
 */
type ReturnPages = {
  connectRedirectUrl: string
  billing: BillingPages
  appUrl: string
}

function createServices(
  db: DataClients,
  providers: Providers,
  pages: ReturnPages,
  analytics: ProductAnalytics
): Services {
  const accountRepository = new SupabaseAccountRepository(db)
  const postRepository = new SupabasePostRepository(db)
  const billingRepository = new SupabaseBillingRepository(db)
  const socialSetRepository = new SupabaseSocialSetRepository(db)
  const operations = new SupabaseWorkspaceOperations(db.privileged)
  const plans = new PlanEntitlements(billingRepository, socialSetRepository)

  const workspaces = new WorkspaceService(
    new SupabaseWorkspaceRepository(db),
    analytics
  )
  const socialSets = new SocialSetService(
    socialSetRepository,
    accountRepository,
    providers.profiles,
    plans,
    operations,
    analytics
  )
  const automations = new AutomationService(
    new SupabaseAutomationRepository(db),
    providers.automations,
    accountRepository,
    providers.accounts,
    postRepository,
    plans,
    operations,
    analytics,
    new SupabaseFollowUpRepository(db.scoped)
  )
  const posts = new PostService(
    postRepository,
    providers.publishing,
    accountRepository,
    automations,
    plans,
    operations,
    analytics
  )
  const accounts = new AccountService(
    accountRepository,
    providers.accounts,
    socialSets,
    automations,
    posts,
    pages.connectRedirectUrl,
    plans,
    operations,
    analytics
  )
  const billing = new BillingService(
    billingRepository,
    providers.billing,
    socialSetRepository,
    automations,
    posts,
    pages.billing,
    operations,
    analytics
  )

  const uploadLinks = new UploadLinkService(
    new SupabaseUploadLinkRepository(db),
    pages.appUrl,
    analytics
  )
  const inbox = new InboxService(providers.inbox, accountRepository, analytics)
  const contacts = new ContactService(providers.contacts, socialSets)
  const insights = new InsightsService(
    providers.insights,
    accountRepository,
    socialSets
  )
  const apiKeys = new ApiKeyService(
    new SupabaseApiKeyRepository(db.privileged),
    analytics
  )

  return {
    apiKeys,
    workspaces,
    accounts,
    automations,
    posts,
    uploadLinks,
    inbox,
    contacts,
    insights,
    socialSets,
    billing,
    plans,
    analytics,
  }
}

type RuntimeOptions = {
  dodo?: DodoClient
  analytics?: Analytics
  runFollowUps?: boolean
}

function runtime(config: ApiConfig, options: RuntimeOptions = {}) {
  const zernio = () => createZernioClient(config.zernio)
  const providers: Providers = {
    profiles: new ZernioProfileProvider(zernio),
    accounts: new ZernioAccountProvider(zernio),
    automations: new ZernioAutomationProvider(zernio),
    publishing: new ZernioPublishingProvider(zernio),
    inbox: new ZernioInboxProvider(zernio),
    contacts: new ZernioContactProvider(zernio),
    insights: new ZernioInsightsProvider(zernio),
    billing: new DodoBillingProvider(
      () => options.dodo ?? createDodoClient(config.dodo)
    ),
  }
  const appPage = (path: string) => new URL(path, config.appUrl).toString()
  const pages: ReturnPages = {
    connectRedirectUrl: appPage(CONNECT_CALLBACK_PATH),
    billing: {
      checkoutReturn: appPage(BILLING_PATH),
      checkoutCancel: appPage(BILLING_PATH),
      portalReturn: appPage(BILLING_PATH),
    },
    appUrl: config.appUrl,
  }
  const admin = createAdminSupabaseClient(config.supabase)
  const analytics =
    options.analytics ??
    (config.posthog ? new PostHogAnalytics(config.posthog) : DISABLED_ANALYTICS)
  return { providers, pages, admin, analytics }
}

/** A backend-only rollout command; it uses the API's provider and plan policy. */
export function createBillingMaintenance(
  config: ApiConfig,
  options: RuntimeOptions = {}
) {
  const { admin, providers, pages, analytics } = runtime(config, options)
  const services = createServices(
    { scoped: admin, privileged: admin },
    providers,
    pages,
    analytics.from("maintenance")
  )
  const reconciliation = new SupabaseBillingReconciliation(
    admin,
    services.billing
  )
  return {
    /** Reconciles the workspaces, then sends the events it recorded. */
    run: async (log: (message: string) => void) => {
      try {
        return await reconciliation.run(log)
      } finally {
        await analytics.shutdown()
      }
    },
  }
}

/** Composition root: builds the API from its configuration. */
export function createApi(
  config: ApiConfig,
  options: RuntimeOptions = {}
): ApiApp {
  const { admin, providers, pages, analytics } = runtime(config, options)

  // Each request gets services whose reads run as the signed-in user.
  const authenticate: Authenticate = async (accessToken) => {
    const scoped = createUserSupabaseClient(config.supabase, accessToken)
    const { data } = await scoped.auth.getClaims(accessToken)

    if (!data) {
      throw new UnauthenticatedError()
    }

    const services = createServices(
      { scoped, privileged: admin },
      providers,
      pages,
      analytics.from("dashboard")
    )

    return {
      services,
      workspace: await services.workspaces.getForOwner(data.claims.sub),
    }
  }

  const apiKeys = new ApiKeyService(
    new SupabaseApiKeyRepository(admin),
    analytics.from("api")
  )
  const authenticateAgent: AuthenticateAgent = async (token, source) => {
    const key = await apiKeys.authenticate(token)
    const db = { scoped: admin, privileged: admin }
    const workspace = await new SupabaseWorkspaceRepository(db).findById(
      key.workspaceId
    )
    if (!workspace) throw new InvalidApiKeyError()
    return {
      apiKey: key,
      workspace,
      // Key requests have no Supabase user JWT. Every exposed repository
      // operation filters by this verified workspace before any provider call.
      services: createServices(db, providers, pages, analytics.from(source)),
    }
  }

  // An MCP client that signs in receives a workspace API key, so it connects
  // and is revoked like any other key.
  const oauth = new OAuthService(
    new SupabaseOAuthRepository(admin),
    new SupabaseWorkspaceRepository({ scoped: admin, privileged: admin }),
    new ApiKeyService(
      new SupabaseApiKeyRepository(admin),
      analytics.from("mcp")
    ),
    oauthEndpoints(config.appUrl)
  )

  const webhooks = new WebhookService(
    new ZernioWebhookGateway(config.zernio.webhookSecret),
    new SupabaseWebhookProcessor(
      admin,
      providers.accounts,
      new SupabaseWorkspaceOperations(admin),
      analytics.from("webhook")
    )
  )
  // Billing webhooks act for whichever workspace the subscription belongs to.
  const backend = createServices(
    { scoped: admin, privileged: admin },
    providers,
    pages,
    analytics.from("webhook")
  )
  const billingWebhooks = new BillingWebhookService(
    new DodoWebhookGateway(config.dodo.webhookKey),
    backend.billing
  )

  const app = createApp({
    authenticate,
    authenticateAgent,
    webhooks,
    billingWebhooks,
    oauth,
    analytics,
    config,
  })
  if (options.runFollowUps && config.zernio.apiKey) {
    const followUps = new FollowUpService(
      new SupabaseFollowUpRepository(admin),
      new ZernioFollowUpProvider(() => createZernioClient(config.zernio)),
      new SupabaseWorkspaceOperations(admin)
    )
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    let running: Promise<void> | undefined
    const poll = () => {
      if (stopped) return
      running = followUps
        .run((err, jobId) =>
          app.log.error({ err, jobId }, "Follow-up delivery failed")
        )
        .catch((err) => app.log.error({ err }, "Follow-up polling failed"))
        .finally(() => {
          if (!stopped) {
            timer = setTimeout(poll, 15_000)
            timer.unref()
          }
        })
    }
    app.addHook("onReady", async () => {
      poll()
    })
    app.addHook("onClose", async () => {
      stopped = true
      clearTimeout(timer)
      await running
    })
  }
  return app
}
