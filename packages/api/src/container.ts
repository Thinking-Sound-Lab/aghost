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
import { SupabaseAccountRepository } from "./infrastructure/supabase/supabase-account.repository"
import { SupabaseApiKeyRepository } from "./infrastructure/supabase/supabase-api-key.repository"
import { SupabaseAutomationRepository } from "./infrastructure/supabase/supabase-automation.repository"
import { SupabaseBillingRepository } from "./infrastructure/supabase/supabase-billing.repository"
import { SupabaseWebhookProcessor } from "./infrastructure/supabase/supabase-webhook.processor"
import { SupabaseWorkspaceRepository } from "./infrastructure/supabase/supabase-workspace.repository"
import { SupabaseWorkspaceOperations } from "./infrastructure/supabase/supabase-workspace-operations"
import { SupabaseBillingReconciliation } from "./infrastructure/supabase/supabase-billing-reconciliation"
import { ZernioAutomationProvider } from "./infrastructure/zernio/zernio-automation.provider"
import { createZernioClient } from "./infrastructure/zernio/zernio-client"
import { ZernioContactProvider } from "./infrastructure/zernio/zernio-contact.provider"
import { ZernioInboxProvider } from "./infrastructure/zernio/zernio-inbox.provider"
import { ZernioInstagramProvider } from "./infrastructure/zernio/zernio-instagram.provider"
import { ZernioProfileProvider } from "./infrastructure/zernio/zernio-profile.provider"
import { ZernioWebhookGateway } from "./infrastructure/zernio/zernio-webhook.gateway"
import { AccountService } from "./modules/accounts/account.service"
import {
  DISABLED_ANALYTICS,
  type Analytics,
  type ProductAnalytics,
} from "./modules/analytics/analytics"
import { ApiKeyService } from "./modules/api-keys/api-key.service"
import type { InstagramProvider } from "./modules/accounts/instagram.provider"
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
import { WebhookService } from "./modules/webhooks/webhook.service"
import type { ProfileProvider } from "./modules/workspaces/profile.provider"
import { WorkspaceService } from "./modules/workspaces/workspace.service"
import { InvalidApiKeyError, UnauthenticatedError } from "./shared/errors"

// Path of the page in the web app that finishes the Instagram connection.
const CONNECT_CALLBACK_PATH = "/accounts/callback"
// Where checkout and the billing portal send the browser back to.
const BILLING_PATH = "/settings#billing"

export type Services = {
  apiKeys: ApiKeyService
  workspaces: WorkspaceService
  accounts: AccountService
  automations: AutomationService
  inbox: InboxService
  contacts: ContactService
  billing: BillingService
  plans: PlanEntitlements
  /** Records events with the source of the request these services serve. */
  analytics: ProductAnalytics
}

type Providers = {
  profiles: ProfileProvider
  instagram: InstagramProvider
  automations: AutomationProvider
  inbox: InboxProvider
  contacts: ContactProvider
  billing: BillingProvider
}

/** Addresses in the web app that providers send the browser back to. */
type ReturnPages = { connectRedirectUrl: string; billing: BillingPages }

function createServices(
  db: DataClients,
  providers: Providers,
  pages: ReturnPages,
  analytics: ProductAnalytics
): Services {
  const accountRepository = new SupabaseAccountRepository(db)
  const billingRepository = new SupabaseBillingRepository(db)
  const operations = new SupabaseWorkspaceOperations(db.privileged)
  const plans = new PlanEntitlements(billingRepository, accountRepository)

  const workspaces = new WorkspaceService(
    new SupabaseWorkspaceRepository(db),
    providers.profiles,
    analytics
  )
  const automations = new AutomationService(
    new SupabaseAutomationRepository(db),
    providers.automations,
    accountRepository,
    providers.instagram,
    plans,
    operations,
    analytics
  )
  const accounts = new AccountService(
    accountRepository,
    providers.instagram,
    workspaces,
    automations,
    pages.connectRedirectUrl,
    plans,
    operations,
    analytics
  )
  const billing = new BillingService(
    billingRepository,
    providers.billing,
    accountRepository,
    automations,
    pages.billing,
    operations,
    analytics
  )

  const inbox = new InboxService(providers.inbox, accountRepository, analytics)
  const contacts = new ContactService(providers.contacts)
  const apiKeys = new ApiKeyService(
    new SupabaseApiKeyRepository(db.privileged),
    analytics
  )

  return {
    apiKeys,
    workspaces,
    accounts,
    automations,
    inbox,
    contacts,
    billing,
    plans,
    analytics,
  }
}

type RuntimeOptions = { dodo?: DodoClient; analytics?: Analytics }

function runtime(config: ApiConfig, options: RuntimeOptions = {}) {
  const zernio = () => createZernioClient(config.zernio)
  const providers: Providers = {
    profiles: new ZernioProfileProvider(zernio),
    instagram: new ZernioInstagramProvider(zernio),
    automations: new ZernioAutomationProvider(zernio),
    inbox: new ZernioInboxProvider(zernio),
    contacts: new ZernioContactProvider(zernio),
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

  const webhooks = new WebhookService(
    new ZernioWebhookGateway(config.zernio.webhookSecret),
    new SupabaseWebhookProcessor(
      admin,
      providers.instagram,
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

  return createApp({
    authenticate,
    authenticateAgent,
    webhooks,
    billingWebhooks,
    analytics,
    config,
  })
}
