import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
} from "@workspace/supabase/server"

import type { ApiConfig } from "./config"
import { createApp, type ApiApp } from "./http/app"
import type { Authenticate, AuthenticateAgent } from "./http/context"
import type { DataClients } from "./infrastructure/supabase/data-clients"
import { SupabaseAccountRepository } from "./infrastructure/supabase/supabase-account.repository"
import { SupabaseApiKeyRepository } from "./infrastructure/supabase/supabase-api-key.repository"
import { SupabaseAutomationRepository } from "./infrastructure/supabase/supabase-automation.repository"
import { SupabaseWebhookProcessor } from "./infrastructure/supabase/supabase-webhook.processor"
import { SupabaseWorkspaceRepository } from "./infrastructure/supabase/supabase-workspace.repository"
import { ZernioAutomationProvider } from "./infrastructure/zernio/zernio-automation.provider"
import { createZernioClient } from "./infrastructure/zernio/zernio-client"
import { ZernioContactProvider } from "./infrastructure/zernio/zernio-contact.provider"
import { ZernioInboxProvider } from "./infrastructure/zernio/zernio-inbox.provider"
import { ZernioInstagramProvider } from "./infrastructure/zernio/zernio-instagram.provider"
import { ZernioProfileProvider } from "./infrastructure/zernio/zernio-profile.provider"
import { ZernioWebhookGateway } from "./infrastructure/zernio/zernio-webhook.gateway"
import { AccountService } from "./modules/accounts/account.service"
import { ApiKeyService } from "./modules/api-keys/api-key.service"
import type { InstagramProvider } from "./modules/accounts/instagram.provider"
import type { AutomationProvider } from "./modules/automations/automation.provider"
import { AutomationService } from "./modules/automations/automation.service"
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

export type Services = {
  apiKeys: ApiKeyService
  workspaces: WorkspaceService
  accounts: AccountService
  automations: AutomationService
  inbox: InboxService
  contacts: ContactService
}

type Providers = {
  profiles: ProfileProvider
  instagram: InstagramProvider
  automations: AutomationProvider
  inbox: InboxProvider
  contacts: ContactProvider
}

function createServices(
  db: DataClients,
  providers: Providers,
  connectRedirectUrl: string
): Services {
  const accountRepository = new SupabaseAccountRepository(db)

  const workspaces = new WorkspaceService(
    new SupabaseWorkspaceRepository(db),
    providers.profiles
  )
  const automations = new AutomationService(
    new SupabaseAutomationRepository(db),
    providers.automations,
    accountRepository,
    providers.instagram
  )
  const accounts = new AccountService(
    accountRepository,
    providers.instagram,
    workspaces,
    automations,
    connectRedirectUrl
  )

  const inbox = new InboxService(providers.inbox, accountRepository)
  const contacts = new ContactService(providers.contacts)
  const apiKeys = new ApiKeyService(new SupabaseApiKeyRepository(db.privileged))

  return { apiKeys, workspaces, accounts, automations, inbox, contacts }
}

/** Composition root: builds the API from its configuration. */
export function createApi(config: ApiConfig): ApiApp {
  const zernio = () => createZernioClient(config.zernio)
  const providers: Providers = {
    profiles: new ZernioProfileProvider(zernio),
    instagram: new ZernioInstagramProvider(zernio),
    automations: new ZernioAutomationProvider(zernio),
    inbox: new ZernioInboxProvider(zernio),
    contacts: new ZernioContactProvider(zernio),
  }
  const connectRedirectUrl = new URL(
    CONNECT_CALLBACK_PATH,
    config.appUrl
  ).toString()
  const admin = createAdminSupabaseClient(config.supabase)

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
      connectRedirectUrl
    )

    return {
      services,
      workspace: await services.workspaces.getForOwner(data.claims.sub),
    }
  }

  const apiKeys = new ApiKeyService(new SupabaseApiKeyRepository(admin))
  const authenticateAgent: AuthenticateAgent = async (token) => {
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
      services: createServices(db, providers, connectRedirectUrl),
    }
  }

  const webhooks = new WebhookService(
    new ZernioWebhookGateway(config.zernio.webhookSecret),
    new SupabaseWebhookProcessor(admin)
  )

  return createApp({ authenticate, authenticateAgent, webhooks, config })
}
