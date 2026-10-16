import { Webhook } from "standardwebhooks"
import { describe, expect, it, vi } from "vitest"
import {
  BILLING_INTERVALS,
  BILLING_CURRENCIES,
  PLAN_IDS,
  PLANS,
} from "../contract/billing"
import { DodoWebhookGateway } from "../infrastructure/dodo/dodo-webhook.gateway"
import type {
  BillingRecord,
  SubscriptionSnapshot,
} from "../modules/billing/billing"
import type { BillingProvider } from "../modules/billing/billing.provider"
import type { BillingRepository } from "../modules/billing/billing.repository"
import { subscriptionEvents } from "../modules/billing/billing-analytics"
import { BillingService } from "../modules/billing/billing.service"
import { PlanEntitlements } from "../modules/billing/plan-entitlements"
import type { WorkspaceRecord } from "../modules/workspaces/workspace"
import { recordingAnalytics } from "./analytics-fixture"

const workspace: WorkspaceRecord = {
  id: "workspace",
  ownerId: "owner",
  name: "Studio",
  providerProfileId: "profile",
}

function subscription(
  overrides: Partial<SubscriptionSnapshot> = {}
): SubscriptionSnapshot {
  return {
    providerSubscriptionId: "sub_1",
    providerCustomerId: "cus_1",
    plan: "pro",
    interval: "monthly",
    status: "active",
    currency: "USD",
    currentPeriodEnd: "2026-11-11T00:00:00Z",
    cancelAtPeriodEnd: false,
    createdAt: "2026-10-11T00:00:00Z",
    ...overrides,
  }
}

/** An in-memory store holding at most one workspace's billing. */
function memoryRepository(
  initial: Omit<BillingRecord, "checkout"> | null
): BillingRepository & {
  record: BillingRecord | null
} {
  const store = {
    record: initial
      ? { ...initial, checkout: null }
      : (null as BillingRecord | null),
    findByWorkspace: async (workspaceId: string) =>
      store.record?.workspaceId === workspaceId ? store.record : null,
    findWorkspaceByCustomer: async (customerId: string) =>
      store.record?.providerCustomerId === customerId
        ? { id: store.record.workspaceId, ownerId: workspace.ownerId }
        : null,
    saveCustomer: async (workspaceId: string, customerId: string) => {
      store.record ??= {
        workspaceId,
        providerCustomerId: customerId,
        subscription: null,
        checkout: null,
      }
      return store.record
    },
    saveSubscription: async (
      _workspaceId: string,
      snapshot: SubscriptionSnapshot
    ) => {
      if (!store.record) throw new Error("No customer")
      store.record = { ...store.record, subscription: snapshot }
    },
    reserveCheckout: async (
      _workspaceId: string,
      choice: {
        plan: "pro" | "growth" | "business"
        interval: "monthly" | "yearly"
      }
    ) => {
      if (!store.record || store.record.checkout)
        throw new Error("Already reserved")
      store.record.checkout = {
        ...choice,
        requestedAt: new Date().toISOString(),
        session: null,
      }
    },
    saveCheckout: async (
      _workspaceId: string,
      session: { providerSessionId: string; url: string }
    ) => {
      if (!store.record?.checkout) throw new Error("No reservation")
      store.record.checkout.session = session
    },
    clearCheckout: async () => {
      if (store.record) store.record.checkout = null
    },
  }
  return store
}

function provider(overrides: Partial<BillingProvider> = {}): BillingProvider {
  return {
    createCustomer: vi.fn(async () => "cus_new"),
    prepareCheckout: vi.fn(async () => "pdt_1"),
    createCheckout: vi.fn(async () => ({
      providerSessionId: "cks_1",
      url: "https://checkout.example/session",
    })),
    getCheckout: vi.fn(async () => ({
      createdAt: new Date().toISOString(),
      payment: "unpaid" as const,
    })),
    getSubscription: vi.fn(async () => null),
    listSubscriptions: vi.fn(async () => []),
    changePlan: vi.fn(async () => null),
    createPortalSession: vi.fn(async () => "https://portal.example"),
    ...overrides,
  }
}

const pages = {
  checkoutReturn: "http://localhost:3000/settings#billing",
  checkoutCancel: "http://localhost:3000/settings#billing",
  portalReturn: "http://localhost:3000/settings#billing",
}

function service(
  repository: BillingRepository,
  billingProvider: BillingProvider,
  connected = 0
) {
  const pauseAll = vi.fn(async () => {})
  const pauseUnsupported = vi.fn(async () => {})
  const cancelAll = vi.fn(async () => {})
  const recorded = recordingAnalytics()
  return {
    pauseAll,
    pauseUnsupported,
    cancelAll,
    recorded,
    billing: new BillingService(
      repository,
      billingProvider,
      { countConnected: async () => connected },
      { pauseAll, pauseUnsupported },
      { cancelAll },
      pages,
      { run: (_workspaceId, work) => work() },
      recorded.source("webhook")
    ),
  }
}

describe("plan catalog", () => {
  it("uses the agreed fixed prices and account counts", () => {
    expect(
      PLAN_IDS.map((id) => [
        PLANS[id].prices.USD.monthly,
        PLANS[id].prices.USD.yearly,
        PLANS[id].instagramAccounts,
      ])
    ).toEqual([
      [900, 10800, 1],
      [1900, 22800, 2],
      [4900, 58800, 5],
    ])
  })
  it("offers only USD prices", () => {
    expect(BILLING_CURRENCIES).toEqual(["USD"])
    for (const plan of PLAN_IDS)
      expect(Object.keys(PLANS[plan].prices)).toEqual(["USD"])
  })

  it("bills a year as twelve months on every plan and currency", () => {
    for (const plan of PLAN_IDS)
      for (const prices of Object.values(PLANS[plan].prices))
        expect(prices.yearly).toBe(prices.monthly * 12)
    expect(BILLING_INTERVALS).toEqual(["monthly", "yearly"])
  })
})

describe("plan entitlements", () => {
  function entitlements(
    snapshot: SubscriptionSnapshot | null,
    connected: number
  ) {
    return new PlanEntitlements(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: snapshot,
      }),
      { countConnected: async () => connected }
    )
  }

  it("opens the workspace only while its plan is active or in its grace period", async () => {
    for (const status of ["active", "past_due"] as const)
      await expect(
        entitlements(subscription({ status }), 0).assertCanUseWorkspace(
          workspace
        )
      ).resolves.toBeUndefined()
    for (const snapshot of [
      null,
      ...(
        [
          "pending",
          "on_hold",
          "paused",
          "cancelled",
          "failed",
          "expired",
        ] as const
      ).map((status) => subscription({ status })),
    ])
      await expect(
        entitlements(snapshot, 0).assertCanUseWorkspace(workspace)
      ).rejects.toMatchObject({
        code: "plan_required",
        message: "Choose a plan to use this workspace.",
      })
  })

  it("asks for a plan before an account can be connected", async () => {
    await expect(
      entitlements(null, 0).assertCanConnectAccount(workspace)
    ).rejects.toMatchObject({ code: "plan_required" })
  })

  it("stops at the plan's account limit", async () => {
    await expect(
      entitlements(subscription(), 1).assertCanConnectAccount(workspace)
    ).rejects.toMatchObject({
      code: "plan_limit_reached",
      message: "Pro includes 1 Instagram account. Upgrade to connect another.",
    })
    await expect(
      entitlements(subscription({ plan: "growth" }), 1).assertCanConnectAccount(
        workspace
      )
    ).resolves.toBeUndefined()
  })

  it("keeps the plan through the grace period and ends it on hold", async () => {
    await expect(
      entitlements(
        subscription({ status: "past_due" }),
        1
      ).assertCanRunAutomations(workspace)
    ).resolves.toBeUndefined()
    await expect(
      entitlements(
        subscription({ status: "on_hold" }),
        1
      ).assertCanRunAutomations(workspace)
    ).rejects.toMatchObject({ code: "plan_required" })
  })

  it("holds automations while more accounts are connected than the plan includes", async () => {
    await expect(
      entitlements(subscription(), 2).assertCanRunAutomations(workspace)
    ).rejects.toMatchObject({ code: "plan_limit_reached" })
  })
})

describe("billing", () => {
  it("enforces automation feature access when a subscription is downgraded", async () => {
    const repository = memoryRepository({
      workspaceId: workspace.id,
      providerCustomerId: "cus_1",
      subscription: subscription({ plan: "business" }),
    })
    const { billing, pauseAll, pauseUnsupported } = service(
      repository,
      provider({
        getSubscription: async () => subscription({ plan: "growth" }),
      })
    )
    await billing.refreshSubscription("sub_1")
    expect(pauseUnsupported).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: workspace.id }),
      PLANS.growth
    )
    expect(pauseAll).not.toHaveBeenCalled()
  })
  it("reuses an unpaid checkout and creates the customer once", async () => {
    const repository = memoryRepository(null)
    const dodo = provider()
    const { billing, recorded } = service(repository, dodo)
    const payer = { email: "maya@example.com", name: "Maya" }

    await billing.startCheckout(workspace, payer, {
      plan: "growth",
      interval: "yearly",
    })
    await billing.startCheckout(workspace, payer, {
      plan: "growth",
      interval: "yearly",
    })

    expect(dodo.createCustomer).toHaveBeenCalledOnce()
    expect(dodo.createCheckout).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        providerCustomerId: "cus_new",
        plan: "growth",
        interval: "yearly",
      })
    )
    expect(dodo.createCheckout).toHaveBeenCalledOnce()
    expect(vi.mocked(dodo.createCheckout).mock.calls[0]![0]).not.toHaveProperty(
      "country"
    )
    expect(recorded.events.map(({ event }) => event)).toEqual([
      expect.objectContaining({ name: "checkout_started", resumed: false }),
      expect.objectContaining({ name: "checkout_started", resumed: true }),
    ])
    expect(recorded.events[0]!.event).toMatchObject({
      plan: "growth",
      billing_interval: "yearly",
      price_usd: 228,
    })
  })

  it("does not create another checkout after a lost creation response", async () => {
    const repository = memoryRepository(null)
    const dodo = provider({
      createCheckout: vi.fn(async () => {
        throw new Error("Response lost")
      }),
    })
    const { billing } = service(repository, dodo)
    const args = [
      workspace,
      { email: "maya@example.com", name: "Maya" },
      { plan: "pro", interval: "monthly" },
    ] as const
    await expect(billing.startCheckout(...args)).rejects.toThrow(
      "Response lost"
    )
    await expect(billing.startCheckout(...args)).rejects.toMatchObject({
      code: "conflict",
    })
    expect(dodo.createCheckout).toHaveBeenCalledOnce()
    expect(repository.record?.checkout?.session).toBeNull()
  })

  it("keeps an expired checkout reserved while its payment is processing", async () => {
    const repository = memoryRepository(null)
    const dodo = provider({
      getCheckout: async () => ({
        createdAt: "2020-01-01T00:00:00Z",
        payment: "pending",
      }),
    })
    const { billing } = service(repository, dodo)
    const args = [
      workspace,
      { email: "maya@example.com", name: "Maya" },
      { plan: "pro", interval: "monthly" },
    ] as const
    await billing.startCheckout(...args)
    await expect(billing.startCheckout(...args)).rejects.toMatchObject({
      code: "conflict",
    })
    expect(dodo.createCheckout).toHaveBeenCalledOnce()
  })

  it("replaces an abandoned unpaid checkout when another plan is chosen", async () => {
    const repository = memoryRepository(null)
    const dodo = provider()
    const { billing } = service(repository, dodo)
    const payer = { email: "maya@example.com", name: "Maya" }
    await billing.startCheckout(workspace, payer, {
      plan: "pro",
      interval: "monthly",
    })
    vi.mocked(dodo.createCheckout).mockResolvedValueOnce({
      providerSessionId: "cks_2",
      url: "https://checkout.example/another",
    })
    await expect(
      billing.startCheckout(workspace, payer, {
        plan: "business",
        interval: "yearly",
      })
    ).resolves.toBe("https://checkout.example/another")
    expect(dodo.createCustomer).toHaveBeenCalledOnce()
    expect(dodo.createCheckout).toHaveBeenCalledTimes(2)
    expect(repository.record?.checkout).toMatchObject({
      plan: "business",
      interval: "yearly",
      session: { providerSessionId: "cks_2" },
    })
  })

  it("keeps the previous checkout resumable when its replacement cannot be priced", async () => {
    const repository = memoryRepository(null)
    const dodo = provider()
    const { billing } = service(repository, dodo)
    const payer = { email: "maya@example.com", name: "Maya" }
    const original = { plan: "pro", interval: "monthly" } as const
    const url = await billing.startCheckout(workspace, payer, original)
    vi.mocked(dodo.prepareCheckout).mockRejectedValueOnce(
      new Error("Price mismatch")
    )
    await expect(
      billing.startCheckout(workspace, payer, {
        plan: "business",
        interval: "yearly",
      })
    ).rejects.toThrow("Price mismatch")
    await expect(
      billing.startCheckout(workspace, payer, original)
    ).resolves.toBe(url)
    expect(dodo.createCheckout).toHaveBeenCalledOnce()
  })

  it("refuses another plan while the previous checkout's payment is processing", async () => {
    const repository = memoryRepository(null)
    const dodo = provider({
      getCheckout: async () => ({
        createdAt: new Date().toISOString(),
        payment: "pending",
      }),
    })
    const { billing } = service(repository, dodo)
    const payer = { email: "maya@example.com", name: "Maya" }
    await billing.startCheckout(workspace, payer, {
      plan: "pro",
      interval: "monthly",
    })
    await expect(
      billing.startCheckout(workspace, payer, {
        plan: "business",
        interval: "yearly",
      })
    ).rejects.toMatchObject({ code: "conflict" })
    expect(dodo.createCheckout).toHaveBeenCalledOnce()
    expect(repository.record?.checkout).toMatchObject({ plan: "pro" })
  })

  it.each([
    { createdAt: new Date().toISOString(), payment: "failed" as const },
    { createdAt: "2020-01-01T00:00:00Z", payment: "unpaid" as const },
  ])(
    "starts a new checkout for the same plan once the previous link is $payment and cannot be resumed",
    async (status) => {
      const dodo = provider({ getCheckout: async () => status })
      const { billing } = service(memoryRepository(null), dodo)
      const args = [
        workspace,
        { email: "maya@example.com", name: "Maya" },
        { plan: "pro", interval: "monthly" },
      ] as const
      await billing.startCheckout(...args)
      await billing.startCheckout(...args)
      expect(dodo.createCheckout).toHaveBeenCalledTimes(2)
    }
  )

  it.each([
    null,
    {
      workspaceId: workspace.id,
      providerCustomerId: "cus_1",
      subscription: null,
    },
  ])(
    "pauses legacy running automations even without a subscription (%s)",
    async (record) => {
      const { billing, pauseAll } = service(
        memoryRepository(record),
        provider()
      )
      await billing.sync(workspace)
      expect(pauseAll).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: workspace.id,
          ownerId: workspace.ownerId,
        })
      )
    }
  )

  it("refuses a second checkout while a plan is active", async () => {
    const { billing } = service(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: subscription(),
      }),
      provider()
    )
    await expect(
      billing.startCheckout(
        workspace,
        { email: "maya@example.com", name: "Maya" },
        { plan: "growth", interval: "monthly" }
      )
    ).rejects.toMatchObject({ code: "conflict" })
  })

  it("checks Dodo for a completed checkout whose webhook has not arrived", async () => {
    const dodo = provider({ listSubscriptions: async () => [subscription()] })
    const { billing } = service(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: null,
      }),
      dodo
    )
    await expect(
      billing.startCheckout(
        workspace,
        { email: "maya@example.com", name: "Maya" },
        { plan: "growth", interval: "monthly" }
      )
    ).rejects.toMatchObject({ code: "conflict" })
    expect(dodo.createCheckout).not.toHaveBeenCalled()
  })

  it("asks customers with an unsettled payment to manage their subscription", async () => {
    const dodo = provider()
    const { billing } = service(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: subscription({ status: "pending" }),
      }),
      dodo
    )
    await expect(
      billing.startCheckout(
        workspace,
        { email: "maya@example.com", name: "Maya" },
        { plan: "growth", interval: "monthly" }
      )
    ).rejects.toMatchObject({ code: "conflict" })
    expect(dodo.createCheckout).not.toHaveBeenCalled()
  })

  it("returns the payment approval page without granting an unconfirmed plan change", async () => {
    const dodo = provider({
      changePlan: async () => "https://checkout.example/approve",
      getSubscription: async () => subscription(),
    })
    const { billing, recorded } = service(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: subscription(),
      }),
      dodo
    )
    expect(
      await billing.changePlan(workspace, {
        plan: "growth",
        interval: "yearly",
      })
    ).toMatchObject({
      state: { subscription: { plan: "pro", interval: "monthly" } },
      paymentUrl: "https://checkout.example/approve",
    })
    // Requested, but not changed until the payment is approved.
    expect(recorded.namesFor(workspace.ownerId)).toEqual([
      "plan_change_requested",
    ])
    expect(recorded.events[0]!.event).toMatchObject({
      plan: "growth",
      from_plan: "pro",
      payment_required: true,
    })
  })

  it("pauses running automations when a portal downgrade exceeds the account limit", async () => {
    const repository = memoryRepository({
      workspaceId: workspace.id,
      providerCustomerId: "cus_1",
      subscription: subscription({ plan: "business" }),
    })
    const { billing, pauseAll, cancelAll } = service(
      repository,
      provider({ getSubscription: async () => subscription({ plan: "pro" }) }),
      3
    )
    await billing.refreshSubscription("sub_1")
    expect(pauseAll).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: workspace.id, ownerId: workspace.ownerId })
    )
    // The plan continues, so its owner can still manage scheduled posts.
    expect(cancelAll).not.toHaveBeenCalled()
  })

  it("applies the subscription Dodo reports and stops automations and posts when the plan ends", async () => {
    const repository = memoryRepository({
      workspaceId: workspace.id,
      providerCustomerId: "cus_1",
      subscription: subscription(),
    })
    const onHold = subscription({ status: "on_hold" })
    const { billing, pauseAll, cancelAll, recorded } = service(
      repository,
      provider({ getSubscription: async () => onHold })
    )

    await expect(billing.refreshSubscription("sub_1")).resolves.toBe(
      "processed"
    )
    expect(repository.record?.subscription).toEqual(onHold)
    expect(recorded.events).toEqual([
      {
        source: "webhook",
        actor: { userId: workspace.ownerId, workspaceId: workspace.id },
        event: expect.objectContaining({
          name: "subscription_ended",
          status: "on_hold",
          mrr_usd: 0,
          previous_mrr_usd: 9,
        }),
      },
    ])
    expect(recorded.workspaces).toEqual([
      {
        workspace: { id: workspace.id, ownerId: workspace.ownerId },
        traits: expect.objectContaining({
          subscription_status: "on_hold",
          mrr_usd: 0,
        }),
      },
    ])
    expect(pauseAll).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: workspace.id, ownerId: workspace.ownerId })
    )
    expect(cancelAll).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: workspace.id, ownerId: workspace.ownerId })
    )
  })

  it.each(["pause", "cancel", "both"] as const)(
    "attempts both plan-end cleanups when %s fails, then retries the failure",
    async (failure) => {
      const repository = memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: subscription(),
      })
      const { billing, pauseAll, cancelAll } = service(
        repository,
        provider({
          getSubscription: async () => subscription({ status: "on_hold" }),
        })
      )
      const pauseError = new Error("Rate limited while pausing automations")
      const cancelError = new Error("Rate limited while cancelling posts")
      if (failure !== "cancel") pauseAll.mockRejectedValueOnce(pauseError)
      if (failure !== "pause") cancelAll.mockRejectedValueOnce(cancelError)

      const attempt = billing.refreshSubscription("sub_1")
      if (failure === "both")
        await expect(attempt).rejects.toMatchObject({
          errors: [pauseError, cancelError],
        })
      else
        await expect(attempt).rejects.toBe(
          failure === "pause" ? pauseError : cancelError
        )
      expect(repository.record?.subscription?.status).toBe("on_hold")
      expect(pauseAll).toHaveBeenCalledOnce()
      expect(cancelAll).toHaveBeenCalledOnce()

      await expect(billing.refreshSubscription("sub_1")).resolves.toBe(
        "processed"
      )
      expect(pauseAll).toHaveBeenCalledTimes(2)
      expect(cancelAll).toHaveBeenCalledTimes(2)
    }
  )

  it("ignores subscriptions of customers it does not know", async () => {
    const { billing, pauseAll } = service(
      memoryRepository(null),
      provider({
        getSubscription: async () =>
          subscription({ providerCustomerId: "cus_other" }),
      })
    )
    await expect(billing.refreshSubscription("sub_1")).resolves.toBe("ignored")
    expect(pauseAll).not.toHaveBeenCalled()
  })

  it("keeps an active subscription when an older one of the customer expires", async () => {
    const active = subscription({
      providerSubscriptionId: "sub_new",
      createdAt: "2026-10-11T00:00:00Z",
    })
    const repository = memoryRepository({
      workspaceId: workspace.id,
      providerCustomerId: "cus_1",
      subscription: active,
    })
    const { billing, pauseAll } = service(
      repository,
      provider({
        getSubscription: async () =>
          subscription({
            providerSubscriptionId: "sub_old",
            status: "expired",
            createdAt: "2026-01-01T00:00:00Z",
          }),
      })
    )

    await billing.refreshSubscription("sub_old")
    expect(repository.record?.subscription).toEqual(active)
    expect(pauseAll).not.toHaveBeenCalled()
  })

  it("syncs to the subscription that grants a plan, even when an ended one is newer", async () => {
    const repository = memoryRepository({
      workspaceId: workspace.id,
      providerCustomerId: "cus_1",
      subscription: null,
    })
    const current = subscription({ providerSubscriptionId: "sub_paid" })
    const { billing } = service(
      repository,
      provider({
        listSubscriptions: async () => [
          subscription({
            providerSubscriptionId: "sub_failed",
            status: "failed",
            createdAt: "2026-10-12T00:00:00Z",
          }),
          current,
        ],
      })
    )

    const state = await billing.sync(workspace)
    expect(repository.record?.subscription).toEqual(current)
    expect(state.subscription).toMatchObject({ plan: "pro", status: "active" })
  })

  it("refuses to move to a plan with fewer accounts than are connected", async () => {
    const dodo = provider()
    const { billing } = service(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: subscription({ plan: "business" }),
      }),
      dodo,
      3
    )
    await expect(
      billing.changePlan(workspace, { plan: "growth", interval: "monthly" })
    ).rejects.toMatchObject({ code: "plan_limit_reached" })
    expect(dodo.changePlan).not.toHaveBeenCalled()
  })

  it("describes an existing subscriber's plan whenever billing is read", async () => {
    const { billing, recorded } = service(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: subscription({ plan: "growth", interval: "yearly" }),
      }),
      provider()
    )
    await billing.getState(workspace)
    // Nothing changed, so nothing is reported as an event.
    expect(recorded.events).toEqual([])
    expect(recorded.workspaces).toEqual([
      {
        workspace,
        traits: {
          plan: "growth",
          billing_interval: "yearly",
          subscription_status: "active",
          mrr_usd: 19,
          cancel_at_period_end: false,
        },
      },
    ])
  })

  it("shows USD before and after subscribing", async () => {
    const empty = service(memoryRepository(null), provider()).billing
    expect((await empty.getState(workspace)).currency).toBe("USD")

    const subscribed = service(
      memoryRepository({
        workspaceId: workspace.id,
        providerCustomerId: "cus_1",
        subscription: subscription({ currency: "USD" }),
      }),
      provider()
    ).billing
    expect((await subscribed.getState(workspace)).currency).toBe("USD")
  })
})

describe("subscription analytics", () => {
  const names = (...args: Parameters<typeof subscriptionEvents>) =>
    subscriptionEvents(...args).map((event) => event.name)

  it("starts a plan on the first entitled subscription, with its revenue", () => {
    expect(
      subscriptionEvents(null, subscription({ interval: "yearly" }))
    ).toEqual([
      {
        name: "subscription_started",
        subscription_id: "sub_1",
        plan: "pro",
        billing_interval: "yearly",
        status: "active",
        price_usd: 108,
        mrr_usd: 9,
        previous_status: null,
      },
    ])
    expect(names(subscription({ status: "pending" }), subscription())).toEqual([
      "subscription_started",
    ])
  })

  it("records nothing for a pending first payment or an unchanged plan", () => {
    expect(names(null, subscription({ status: "pending" }))).toEqual([])
    expect(names(subscription(), subscription())).toEqual([])
  })

  it("tells renewals, plan changes and cancellations apart", () => {
    expect(
      names(
        subscription(),
        subscription({ currentPeriodEnd: "2026-12-11T00:00:00Z" })
      )
    ).toEqual(["subscription_renewed"])
    expect(
      subscriptionEvents(
        subscription(),
        subscription({
          plan: "growth",
          currentPeriodEnd: "2026-12-11T00:00:00Z",
        })
      )
    ).toEqual([
      expect.objectContaining({
        name: "subscription_plan_changed",
        plan: "growth",
        from_plan: "pro",
        mrr_usd: 19,
        previous_mrr_usd: 9,
      }),
    ])
    expect(
      names(subscription(), subscription({ cancelAtPeriodEnd: true }))
    ).toEqual(["subscription_cancellation_scheduled"])
    expect(
      names(subscription({ cancelAtPeriodEnd: true }), subscription())
    ).toEqual(["subscription_cancellation_withdrawn"])
  })

  it("reports a missed payment and the end of the plan", () => {
    expect(names(subscription(), subscription({ status: "past_due" }))).toEqual(
      ["subscription_status_changed"]
    )
    expect(
      names(
        subscription({ status: "past_due" }),
        subscription({ status: "cancelled" })
      )
    ).toEqual(["subscription_ended"])
    expect(
      names(
        subscription({ status: "pending" }),
        subscription({ status: "failed" })
      )
    ).toEqual(["subscription_status_changed"])
  })
})

describe("Dodo webhook events", () => {
  const secret = `whsec_${Buffer.from("billing-test").toString("base64")}`
  const gateway = new DodoWebhookGateway(secret)

  function deliver(payload: unknown) {
    const body = JSON.stringify(payload)
    const now = new Date()
    return gateway.verify(body, {
      "webhook-id": "msg_1",
      "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
      "webhook-signature": new Webhook(secret).sign("msg_1", now, body),
    })
  }

  it("names the subscription a subscription event is about", () => {
    expect(
      deliver({
        type: "subscription.on_hold",
        data: { subscription_id: "sub_1", status: "on_hold" },
      })
    ).toEqual({ kind: "subscription_changed", providerSubscriptionId: "sub_1" })
  })

  it("refreshes a subscription after its payment succeeds", () => {
    expect(
      deliver({
        type: "payment.succeeded",
        data: { payment_id: "pay_1", subscription_id: "sub_1" },
      })
    ).toEqual({ kind: "subscription_changed", providerSubscriptionId: "sub_1" })
  })

  it("rejects a forged signature and a stale delivery", () => {
    const body = JSON.stringify({
      type: "subscription.active",
      data: { subscription_id: "sub_1" },
    })
    const now = new Date()
    const headers = {
      "webhook-id": "msg_1",
      "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
      "webhook-signature": "v1,forged",
    }
    expect(() => gateway.verify(body, headers)).toThrowError("webhook")
    const stale = new Date(now.getTime() - 600_000)
    expect(() =>
      gateway.verify(body, {
        ...headers,
        "webhook-timestamp": String(Math.floor(stale.getTime() / 1000)),
        "webhook-signature": new Webhook(secret).sign("msg_1", stale, body),
      })
    ).toThrowError("webhook")
  })
})
