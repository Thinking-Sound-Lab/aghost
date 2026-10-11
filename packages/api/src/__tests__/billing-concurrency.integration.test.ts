import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
} from "@workspace/supabase/server"
import { loadApiConfig } from "../config"
import type { CreateAutomationInput } from "../contract/automation"
import { SupabaseAccountRepository } from "../infrastructure/supabase/supabase-account.repository"
import { SupabaseAutomationRepository } from "../infrastructure/supabase/supabase-automation.repository"
import { SupabaseBillingRepository } from "../infrastructure/supabase/supabase-billing.repository"
import { SupabaseBillingReconciliation } from "../infrastructure/supabase/supabase-billing-reconciliation"
import { SupabaseWorkspaceOperations } from "../infrastructure/supabase/supabase-workspace-operations"
import { SupabaseWebhookProcessor } from "../infrastructure/supabase/supabase-webhook.processor"
import { AccountService } from "../modules/accounts/account.service"
import type { ProviderAccount } from "../modules/accounts/account"
import type { InstagramProvider } from "../modules/accounts/instagram.provider"
import type { AutomationProvider } from "../modules/automations/automation.provider"
import { AutomationService } from "../modules/automations/automation.service"
import type { SubscriptionSnapshot } from "../modules/billing/billing"
import type { BillingProvider } from "../modules/billing/billing.provider"
import { BillingService } from "../modules/billing/billing.service"
import { PlanEntitlements } from "../modules/billing/plan-entitlements"
import type { WorkspaceRecord } from "../modules/workspaces/workspace"
import type { WorkspaceOperations } from "../modules/workspaces/workspace-operations"
import type { InboundEvent } from "../modules/webhooks/inbound-event"
import { recordingAnalytics } from "./analytics-fixture"
import { signInDisposableUser } from "./session-fixture"

const config = loadApiConfig(
  parseEnv(readFileSync(new URL("../../../../.env", import.meta.url), "utf8"))
)
if (!["localhost", "127.0.0.1"].includes(new URL(config.supabase.url).hostname))
  throw new Error("Concurrency tests may only use local Supabase.")
const admin = createAdminSupabaseClient(config.supabase)
const db = { scoped: admin, privileged: admin }
const users: string[] = []

function latch() {
  let release!: () => void
  const wait = new Promise<void>((resolve) => {
    release = resolve
  })
  return { wait, release }
}

async function context() {
  const ownerId = randomUUID()
  const email = `billing-race-${ownerId}@example.com`
  const user = await admin.auth.admin.createUser({
    id: ownerId,
    email,
    email_confirm: true,
  })
  if (user.error) throw user.error
  users.push(ownerId)
  const inserted = await admin
    .from("workspaces")
    .update({ name: "Race test", zernio_profile_id: `profile_${ownerId}` })
    .eq("owner_id", ownerId)
    .select("id")
    .single()
  if (inserted.error) throw inserted.error
  const workspace: WorkspaceRecord = {
    id: inserted.data.id,
    ownerId,
    name: "Race test",
    providerProfileId: `profile_${ownerId}`,
  }
  const repository = new SupabaseBillingRepository(db)
  const snapshot: SubscriptionSnapshot = {
    providerSubscriptionId: `sub_${workspace.id}`,
    providerCustomerId: `cus_${workspace.id}`,
    plan: "pro",
    interval: "monthly",
    status: "active",
    currency: "USD",
    currentPeriodEnd: "2030-01-01T00:00:00Z",
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
  }
  const remote = new Map<string, string>()
  const provider: AutomationProvider = {
    create: async (_account, _config, status) => {
      const id = randomUUID()
      remote.set(id, status)
      return id
    },
    update: async (id, _config, status) => {
      remote.set(id, status)
    },
    setStatus: async (id, status) => {
      remote.set(id, status)
    },
    delete: async (id) => {
      remote.delete(id)
    },
    listStats: async () => new Map(),
    listActivity: async () => ({ entries: [], total: 0, hasMore: false }),
  }
  const dodo: BillingProvider = {
    createCustomer: vi.fn(async () => snapshot.providerCustomerId),
    prepareCheckout: async () => "pdt_pro_monthly",
    createCheckout: vi.fn(async () => ({
      providerSessionId: `cks_${workspace.id}`,
      url: "https://checkout.example/session",
    })),
    getCheckout: async () => ({
      createdAt: new Date().toISOString(),
      payment: "unpaid",
    }),
    getSubscription: async () => snapshot,
    listSubscriptions: async () => [],
    changePlan: async () => null,
    createPortalSession: async () => "https://portal.example",
  }
  const automations = new SupabaseAutomationRepository(db)
  const accounts = new SupabaseAccountRepository(db)
  const recorded = recordingAnalytics()
  const analytics = recorded.source("webhook")
  const reported = new Map<string, ProviderAccount>()
  const instagram: InstagramProvider = {
    getConnectUrl: async () => "https://instagram.example/connect",
    listAccounts: async () => structuredClone([...reported.values()]),
    listRecentPosts: async () => [],
    disconnectAccount: async (id) => {
      reported.delete(id)
    },
  }
  function services(
    operations: WorkspaceOperations = new SupabaseWorkspaceOperations(admin)
  ) {
    // Separate instances model independent requests/replicas, sharing only PostgreSQL.
    const plans = new PlanEntitlements(repository, accounts)
    const automation = new AutomationService(
      automations,
      provider,
      accounts,
      instagram,
      plans,
      operations,
      analytics
    )
    const billing = new BillingService(
      repository,
      dodo,
      accounts,
      automation,
      {
        checkoutReturn: "https://app.example/settings#billing",
        checkoutCancel: "https://app.example/settings#billing",
        portalReturn: "https://app.example/settings#billing",
      },
      operations,
      analytics
    )
    const account = new AccountService(
      accounts,
      instagram,
      { ensureProviderProfile: async () => `profile_${ownerId}` },
      automation,
      "https://app.example/accounts/callback",
      plans,
      operations,
      analytics
    )
    const webhooks = new SupabaseWebhookProcessor(
      admin,
      instagram,
      operations,
      analytics
    )
    return { automation, billing, account, webhooks, operations }
  }
  async function paidAccount() {
    await repository.saveCustomer(workspace.id, snapshot.providerCustomerId)
    await repository.saveSubscription(workspace.id, snapshot)
    const row = await admin
      .from("instagram_accounts")
      .insert({
        workspace_id: workspace.id,
        zernio_account_id: `account_${workspace.id}`,
        username: "race_creator",
        status: "connected",
      })
      .select("id")
      .single()
    if (row.error) throw row.error
    reported.set(`account_${workspace.id}`, {
      providerAccountId: `account_${workspace.id}`,
      username: "race_creator",
      displayName: null,
      profilePictureUrl: null,
      connected: true,
    })
    const input: CreateAutomationInput = {
      instagramAccountId: row.data.id,
      name: "Race automation",
      status: "active",
      trigger: { postScope: "any_post" },
      keywords: [],
      matchMode: "word",
      openingDm: null,
      dmMessage: "Guide",
      dmButtons: [],
      commentReply: null,
      requireFollow: false,
    }
    return input
  }
  return {
    workspace,
    email,
    repository,
    snapshot,
    remote,
    provider,
    dodo,
    automations,
    accounts,
    reported,
    instagram,
    services,
    paidAccount,
    recorded,
  }
}

describe("billing coordination in PostgreSQL", () => {
  beforeAll(async () => {
    expect(
      (await admin.from("workspace_operations").select("workspace_id").limit(0))
        .error
    ).toBeNull()
  })
  afterAll(async () => {
    for (const id of users) await admin.auth.admin.deleteUser(id)
  })

  it("issues one payable session across simultaneous requests and survives new service instances", async () => {
    const test = await context()
    const [first, second] = [test.services(), test.services()]
    const args = [
      test.workspace,
      { email: test.email, name: "Race test" },
      { plan: "pro", interval: "monthly" },
    ] as const
    const urls = await Promise.all([
      first.billing.startCheckout(...args),
      second.billing.startCheckout(...args),
    ])
    expect(new Set(urls).size).toBe(1)
    expect(test.dodo.createCustomer).toHaveBeenCalledOnce()
    expect(test.dodo.createCheckout).toHaveBeenCalledOnce()
    expect(
      (await test.repository.findByWorkspace(test.workspace.id))?.checkout
        ?.session?.url
    ).toBe(urls[0])
    expect(await test.services().billing.startCheckout(...args)).toBe(urls[0])
    expect(test.dodo.createCheckout).toHaveBeenCalledOnce()
  })

  it("does not apply an active snapshot returned after a newer on-hold refresh", async () => {
    const test = await context()
    await test.paidAccount()
    const entered = latch(),
      finish = latch()
    let reads = 0
    test.dodo.getSubscription = async () => {
      if (++reads === 1) {
        entered.release()
        await finish.wait
        return test.snapshot
      }
      return { ...test.snapshot, status: "on_hold" }
    }
    const old = test
      .services()
      .billing.refreshSubscription(test.snapshot.providerSubscriptionId)
    await entered.wait
    await test
      .services()
      .billing.refreshSubscription(test.snapshot.providerSubscriptionId)
    expect(
      (await test.repository.findByWorkspace(test.workspace.id))?.subscription
        ?.status
    ).toBe("on_hold")
    finish.release()
    await old
    expect(
      (await test.repository.findByWorkspace(test.workspace.id))?.subscription
        ?.status
    ).toBe("on_hold")
    // Both refreshes saw the plan end; only the one that changed it records it.
    expect(
      test.recorded.events.filter(
        ({ event }) => event.name === "subscription_ended"
      )
    ).toHaveLength(1)
  })

  it.each(["create", "update", "activate"] as const)(
    "pauses an in-flight automation %s before shutdown completes",
    async (action) => {
      const test = await context()
      const input = await test.paidAccount()
      const first = test.services(),
        second = test.services()
      const paused = await first.automation.create(test.workspace, {
        ...input,
        status: "paused",
      })
      const entered = latch(),
        finish = latch()
      const gate = async () => {
        entered.release()
        await finish.wait
      }
      const originalCreate = test.provider.create,
        originalUpdate = test.provider.update,
        originalStatus = test.provider.setStatus
      test.provider.create = async (...args) => {
        if (args[2] === "active") await gate()
        return originalCreate(...args)
      }
      test.provider.update = async (...args) => {
        if (args[2] === "active") await gate()
        return originalUpdate(...args)
      }
      test.provider.setStatus = async (...args) => {
        if (args[1] === "active") await gate()
        return originalStatus(...args)
      }
      const activation =
        action === "create"
          ? first.automation.create(test.workspace, input)
          : action === "update"
            ? first.automation.update(test.workspace, paused.id, input)
            : first.automation.setStatus(test.workspace, paused.id, "active")
      await entered.wait
      const read = latch()
      test.dodo.getSubscription = async () => {
        read.release()
        return { ...test.snapshot, status: "on_hold" }
      }
      const shutdown = second.billing.refreshSubscription(
        test.snapshot.providerSubscriptionId
      )
      await read.wait
      // Shutdown cannot skip the paused row and finish while activation owns the workspace.
      expect(
        (await test.repository.findByWorkspace(test.workspace.id))?.subscription
          ?.status
      ).toBe("active")
      finish.release()
      await Promise.all([activation, shutdown])
      expect(
        [...test.remote.values()].every((status) => status === "paused")
      ).toBe(true)
      expect(
        (await test.automations.listByWorkspace(test.workspace.id)).every(
          (automation) => automation.status === "paused"
        )
      ).toBe(true)
      await expect(
        second.automation.setStatus(test.workspace, paused.id, "active")
      ).rejects.toMatchObject({ code: "plan_required" })
    }
  )

  it("reconciles pre-billing automations without any Dodo customer and can be rerun", async () => {
    const test = await context()
    const input = await test.paidAccount()
    const services = test.services()
    await services.automation.create(test.workspace, input)
    expect(
      (
        await admin
          .from("workspace_billing")
          .delete()
          .eq("workspace_id", test.workspace.id)
      ).error
    ).toBeNull()
    const session = await signInDisposableUser(config, test.email, new Map())
    const scoped = createUserSupabaseClient(
      config.supabase,
      session.access_token
    )
    const maintenance = new SupabaseBillingReconciliation(
      scoped,
      services.billing
    )
    await maintenance.run(() => {})
    expect([...test.remote.values()]).toEqual(["paused"])
    expect(
      (await test.automations.listByWorkspace(test.workspace.id))[0]?.status
    ).toBe("paused")
    await maintenance.run(() => {})
  })

  it("pauses older active automations beyond 1,000 newer paused rows and retries failures", async () => {
    const test = await context()
    const input = await test.paidAccount()
    const rows = Array.from({ length: 1_005 }, (_, index) => {
      const active = index < 5
      const providerId = `paged_${test.workspace.id}_${index}`
      test.remote.set(providerId, active ? "active" : "paused")
      return {
        workspace_id: test.workspace.id,
        instagram_account_id: input.instagramAccountId,
        zernio_automation_id: providerId,
        name: `Paged automation ${index}`,
        status: active ? "active" : "paused",
        post_scope: "any_post",
        match_mode: "word",
        dm_message: "Guide",
        // The newest 1,000 rows are all paused; the running rows are older.
        created_at: active ? "2020-01-01T00:00:00Z" : "2026-01-01T00:00:00Z",
      }
    })
    for (let offset = 0; offset < rows.length; offset += 500) {
      expect(
        (
          await admin
            .from("automations")
            .insert(rows.slice(offset, offset + 500))
        ).error
      ).toBeNull()
    }
    const all = await test.automations.listByWorkspace(test.workspace.id)
    expect(all).toHaveLength(1_005)
    expect(new Set(all.map((item) => item.id)).size).toBe(1_005)
    expect(
      await test.automations.listByAccount(
        test.workspace.id,
        input.instagramAccountId
      )
    ).toHaveLength(1_005)

    test.dodo.getSubscription = async () => ({
      ...test.snapshot,
      status: "on_hold",
    })
    const original = test.provider.setStatus
    const setStatus = vi.fn(original)
    setStatus.mockRejectedValueOnce(new Error("Provider unavailable"))
    test.provider.setStatus = setStatus
    const billing = test.services().billing
    await expect(
      billing.refreshSubscription(test.snapshot.providerSubscriptionId)
    ).rejects.toThrow("Provider unavailable")
    await billing.refreshSubscription(test.snapshot.providerSubscriptionId)
    expect(setStatus).toHaveBeenCalledTimes(6)
    expect(
      [...test.remote.values()].every((status) => status === "paused")
    ).toBe(true)
    expect(
      (await test.automations.listByWorkspace(test.workspace.id)).every(
        (item) => item.status === "paused"
      )
    ).toBe(true)
  })

  it.each(["sync", "webhook"] as const)(
    "coordinates an in-flight account %s with a portal downgrade",
    async (source) => {
      const test = await context()
      test.snapshot.plan = "growth"
      const input = await test.paidAccount()
      await test.services().automation.create(test.workspace, input)
      const extra: ProviderAccount = {
        providerAccountId: `extra_${test.workspace.id}`,
        username: "extra_creator",
        displayName: null,
        profilePictureUrl: null,
        connected: true,
      }
      test.reported.set(extra.providerAccountId, extra)
      const entered = latch(),
        finish = latch()
      const base = new SupabaseWorkspaceOperations(admin)
      const operations: WorkspaceOperations = {
        run<T>(id: string, work: () => Promise<T>) {
          return base.run(id, async () => {
            if (source === "webhook") {
              entered.release()
              await finish.wait
            }
            return work()
          })
        },
      }
      if (source === "sync") {
        const save = test.accounts.save.bind(test.accounts)
        test.accounts.save = async (workspaceId, snapshot) => {
          if (snapshot.providerAccountId === extra.providerAccountId) {
            entered.release()
            await finish.wait
          }
          return save(workspaceId, snapshot)
        }
      }
      const first = test.services(operations),
        second = test.services()
      const event: InboundEvent = {
        id: randomUUID(),
        type: "account.connected",
        kind: "account_connected",
        payload: {},
        account: {
          ...extra,
          platform: "instagram",
          providerProfileId: test.workspace.providerProfileId!,
        },
      }
      const callback =
        source === "sync"
          ? first.account.sync(test.workspace)
          : first.webhooks.process(event)
      let downgrade: Promise<unknown> = Promise.resolve()
      try {
        await entered.wait
        expect(
          (
            await admin
              .from("workspace_operations")
              .select("owner")
              .eq("workspace_id", test.workspace.id)
              .single()
          ).data?.owner
        ).toEqual(expect.any(String))
        const read = latch()
        test.dodo.getSubscription = async () => {
          read.release()
          return { ...test.snapshot, plan: "pro" }
        }
        downgrade = second.billing.refreshSubscription(
          test.snapshot.providerSubscriptionId
        )
        await read.wait
        expect(
          (await test.repository.findByWorkspace(test.workspace.id))
            ?.subscription?.plan
        ).toBe("growth")
      } finally {
        finish.release()
        await Promise.all([callback, downgrade])
      }
      expect(await test.accounts.countConnected(test.workspace.id)).toBe(2)
      expect(
        (await test.repository.findByWorkspace(test.workspace.id))?.subscription
          ?.plan
      ).toBe("pro")
      expect([...test.remote.values()]).toEqual(["paused"])
      expect(
        (await test.automations.listByWorkspace(test.workspace.id))[0]?.status
      ).toBe("paused")
    }
  )

  it.each(["sync", "webhook"] as const)(
    "finishes rejected-account %s cleanup before an upgrade and reconnection",
    async (source) => {
      const test = await context()
      await test.paidAccount()
      const extra: ProviderAccount = {
        providerAccountId: `rejected_${test.workspace.id}`,
        username: "rejected_creator",
        displayName: null,
        profilePictureUrl: null,
        connected: true,
      }
      test.reported.set(extra.providerAccountId, extra)
      const entered = latch(),
        finish = latch()
      const disconnect = vi.fn(async (id: string) => {
        entered.release()
        await finish.wait
        test.reported.delete(id)
      })
      test.instagram.disconnectAccount = disconnect
      const first = test.services(),
        second = test.services()
      const event: InboundEvent = {
        id: randomUUID(),
        type: "account.connected",
        kind: "account_connected",
        payload: {},
        account: {
          ...extra,
          platform: "instagram",
          providerProfileId: test.workspace.providerProfileId!,
        },
      }
      const callback =
        source === "sync"
          ? first.account.sync(test.workspace)
          : first.webhooks.process(event)
      let upgrade: Promise<unknown> = Promise.resolve()
      try {
        await entered.wait
        expect(
          (
            await admin
              .from("workspace_operations")
              .select("owner")
              .eq("workspace_id", test.workspace.id)
              .single()
          ).data?.owner
        ).toEqual(expect.any(String))
        const read = latch()
        test.dodo.getSubscription = async () => {
          read.release()
          return { ...test.snapshot, plan: "growth" }
        }
        upgrade = second.billing.refreshSubscription(
          test.snapshot.providerSubscriptionId
        )
        await read.wait
        expect(
          (await test.repository.findByWorkspace(test.workspace.id))
            ?.subscription?.plan
        ).toBe("pro")
        expect(await test.accounts.countConnected(test.workspace.id)).toBe(1)
      } finally {
        finish.release()
        await Promise.all([callback, upgrade])
      }
      // A fresh connection after the upgrade is allowed. A delayed duplicate
      // delivery must not disconnect it based on the old limit rejection.
      test.reported.set(extra.providerAccountId, extra)
      await second.account.sync(test.workspace)
      if (source === "webhook")
        expect(await second.webhooks.process(event)).toBe("duplicate")
      expect(await test.accounts.countConnected(test.workspace.id)).toBe(2)
      expect(test.reported.has(extra.providerAccountId)).toBe(true)
      expect(disconnect).toHaveBeenCalledExactlyOnceWith(
        extra.providerAccountId
      )
    }
  )

  it("keeps old claims owned, rejects another owner's release and denies browser RPC access", async () => {
    const test = await context()
    const owner = randomUUID(),
      other = randomUUID()
    expect(
      (
        await admin.from("workspace_operations").insert({
          workspace_id: test.workspace.id,
          owner,
          started_at: "2000-01-01T00:00:00Z",
        })
      ).error
    ).toBeNull()
    const request = { p_workspace_id: test.workspace.id, p_owner: other }
    expect((await admin.rpc("claim_workspace_operation", request)).data).toBe(
      false
    )
    await admin.rpc("release_workspace_operation", request)
    expect((await admin.rpc("claim_workspace_operation", request)).data).toBe(
      false
    )
    const session = await signInDisposableUser(config, test.email, new Map())
    const browser = createUserSupabaseClient(
      config.supabase,
      session.access_token
    )
    expect(
      (
        await browser.rpc("release_workspace_operation", {
          ...request,
          p_owner: owner,
        })
      ).error?.code
    ).toBe("42501")
    expect(
      (await browser.from("workspace_operations").select()).error?.code
    ).toBe("42501")
    await admin.rpc("release_workspace_operation", {
      ...request,
      p_owner: owner,
    })
    expect((await admin.rpc("claim_workspace_operation", request)).data).toBe(
      true
    )
    await admin.rpc("release_workspace_operation", request)
  })
})
