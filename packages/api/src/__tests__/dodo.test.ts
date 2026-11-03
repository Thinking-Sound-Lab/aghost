import { describe, expect, it } from "vitest"
import { BILLING_INTERVALS, PLAN_IDS } from "../contract/billing"
import { DodoBillingProvider } from "../infrastructure/dodo/dodo-billing.provider"
import { loadCatalog, syncCatalog } from "../infrastructure/dodo/dodo-catalog"
import { dodoFixture } from "./dodo-fixture"

describe("Dodo SDK billing integration", () => {
  it("fixes checkout to USD and leaves the billing country to the customer", async () => {
    const fixture = dodoFixture()
    const provider = new DodoBillingProvider(() => fixture.client)
    const providerProductId = await provider.prepareCheckout("growth", "yearly")
    await provider.createCheckout({
      providerProductId,
      providerCustomerId: "cus_1",
      plan: "growth",
      interval: "yearly",
      trialDays: 0,
      returnUrl: "https://app.example/settings#billing",
      cancelUrl: "https://app.example/settings#billing",
    })
    const checkouts = fixture.requests.filter(
      (request) => request.path === "/checkouts"
    )
    expect(checkouts).toHaveLength(1)
    expect(checkouts[0]!.body).toMatchObject({
      billing_currency: "USD",
      feature_flags: { allow_currency_selection: false },
      product_cart: [{ product_id: "pdt_growth_yearly", quantity: 1 }],
      subscription_data: { trial_period_days: 0 },
    })
    expect(checkouts[0]!.body).not.toHaveProperty("billing_address")
  })

  it("starts a free trial on the checkout, not the product", async () => {
    const fixture = dodoFixture()
    const provider = new DodoBillingProvider(() => fixture.client)
    const providerProductId = await provider.prepareCheckout("pro", "monthly")
    await provider.createCheckout({
      providerProductId,
      providerCustomerId: "cus_1",
      plan: "pro",
      interval: "monthly",
      trialDays: 7,
      returnUrl: "https://app.example/settings#billing",
      cancelUrl: "https://app.example/settings#billing",
    })
    expect(
      fixture.requests.find((request) => request.path === "/checkouts")!.body
    ).toMatchObject({ subscription_data: { trial_period_days: 7 } })
    // The trial is free, but the card is still required.
    expect(fixture.products.get("pdt_pro_monthly")!.price_detail).toMatchObject(
      {
        trial_period_days: 0,
        zero_amount_payment_method_optional: false,
      }
    )
  })

  it("reports a checkout left at the payment form as unpaid until a payment is submitted", async () => {
    const fixture = dodoFixture()
    const provider = new DodoBillingProvider(() => fixture.client)
    const { providerSessionId } = await provider.createCheckout({
      providerProductId: "pdt_pro_monthly",
      providerCustomerId: "cus_1",
      plan: "pro",
      interval: "monthly",
      trialDays: 0,
      returnUrl: "https://app.example/settings#billing",
      cancelUrl: "https://app.example/settings#billing",
    })
    const checkout = fixture.checkouts.get(providerSessionId)!
    expect(await provider.getCheckout(providerSessionId)).toMatchObject({
      payment: "unpaid",
    })
    checkout.payment_id = "pay_1"
    checkout.payment_status = "requires_payment_method"
    expect(await provider.getCheckout(providerSessionId)).toMatchObject({
      payment: "unpaid",
    })
    checkout.payment_status = "processing"
    expect(await provider.getCheckout(providerSessionId)).toMatchObject({
      payment: "pending",
    })
  })

  it("waits for an actual payment after a payment authorization becomes active", async () => {
    const fixture = dodoFixture()
    const provider = new DodoBillingProvider(() => fixture.client)
    fixture.state.subscription = fixture.subscription()
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      status: "pending",
    })
    fixture.state.payments = [fixture.payment({ status: "processing" })]
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      status: "pending",
    })
    fixture.state.payments = [fixture.payment()]
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      status: "active",
      currency: "USD",
      plan: "pro",
    })
    fixture.state.subscription = fixture.subscription({ status: "on_hold" })
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      status: "on_hold",
    })
  })

  it("grants a free trial once its card is authorized, until the first payment", async () => {
    const fixture = dodoFixture()
    const provider = new DodoBillingProvider(() => fixture.client)
    fixture.state.subscription = fixture.subscription({
      trial_period_days: 7,
      next_billing_date: "2026-10-18T00:00:00Z",
    })
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      status: "pending",
      trialEndsAt: null,
    })
    fixture.state.payments = [
      fixture.payment({ payment_id: "pay_authorization", total_amount: 0 }),
    ]
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      status: "active",
      trialEndsAt: "2026-10-18T00:00:00Z",
    })
    fixture.state.subscription = fixture.subscription({
      trial_period_days: 7,
      next_billing_date: "2026-11-18T00:00:00Z",
    })
    fixture.state.payments.push(fixture.payment())
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      status: "active",
      trialEndsAt: null,
    })
  })

  it("keeps the trial when the plan changes during it", async () => {
    const fixture = dodoFixture()
    const provider = new DodoBillingProvider(() => fixture.client)
    fixture.state.subscription = fixture.subscription({ trial_period_days: 7 })
    fixture.state.payments = [
      fixture.payment({ payment_id: "pay_authorization", total_amount: 0 }),
    ]
    await provider.changePlan("sub_1", "business", "yearly")
    expect(fixture.requests.at(-1)!.body).toMatchObject({
      product_id: "pdt_business_yearly",
      proration_billing_mode: "do_not_bill",
    })
    // Once the trial has been paid for, a change is prorated and charged.
    fixture.state.payments.push(fixture.payment())
    await provider.changePlan("sub_1", "growth", "monthly")
    expect(fixture.requests.at(-1)!.body).toMatchObject({
      proration_billing_mode: "prorated_immediately",
    })
  })

  it("grants a subscription whose first period a 100% discount code made free", async () => {
    const fixture = dodoFixture()
    fixture.state.subscription = fixture.subscription()
    fixture.state.payments = [
      fixture.payment({
        payment_id: "pay_free",
        total_amount: 0,
        discounts: [
          { type: "percentage", amount: 10_000, subscription_cycles: 1 },
        ],
      }),
    ]
    expect(
      await new DodoBillingProvider(() => fixture.client).getSubscription(
        "sub_1"
      )
    ).toMatchObject({ status: "active", plan: "pro" })
  })

  it("does not treat a zero authorization or another customer's payment as payment for this plan", async () => {
    const fixture = dodoFixture()
    fixture.state.subscription = fixture.subscription()
    fixture.state.payments = [
      fixture.payment({ payment_id: "pay_authorization", total_amount: 0 }),
      fixture.payment({
        payment_id: "pay_partly_discounted",
        total_amount: 0,
        discounts: [{ type: "percentage", amount: 5_000 }],
      }),
      fixture.payment({
        payment_id: "pay_other_customer",
        total_amount: 0,
        customer: { customer_id: "cus_other" },
        discounts: [{ type: "percentage", amount: 10_000 }],
      }),
      fixture.payment({ customer: { customer_id: "cus_other" } }),
      fixture.payment({
        subscription_id: "sub_other",
        subscription_ids: ["sub_other"],
      }),
    ]
    expect(
      await new DodoBillingProvider(() => fixture.client).getSubscription(
        "sub_1"
      )
    ).toMatchObject({ status: "pending" })
  })

  it("returns a plan-change payment link and keeps a declined change from granting the new plan", async () => {
    const fixture = dodoFixture()
    const provider = new DodoBillingProvider(() => fixture.client)
    fixture.state.subscription = fixture.subscription()
    fixture.state.paymentLink = "https://checkout.example/approval"
    expect(await provider.changePlan("sub_1", "growth", "yearly")).toBe(
      fixture.state.paymentLink
    )
    expect(fixture.requests.at(-1)!.body).toMatchObject({
      product_id: "pdt_growth_yearly",
      proration_billing_mode: "prorated_immediately",
      on_payment_failure: "prevent_change",
    })
    fixture.state.failChange = true
    await expect(
      provider.changePlan("sub_1", "business", "monthly")
    ).rejects.toMatchObject({ code: "provider_error" })
    expect(fixture.state.subscription.product_id).toBe("pdt_pro_monthly")
  })

  it("blocks checkout when a product has an extra currency or country price", async () => {
    const fixture = dodoFixture()
    fixture.rules.get("pdt_pro_monthly")!.push({
      id: "lcp_eu",
      mode: "by_country",
      country_code: "DE",
      currency: "EUR",
      amount: 1000,
    })
    await expect(loadCatalog(fixture.client)).rejects.toThrow(
      "localized prices"
    )
    expect(
      fixture.requests.some((request) => request.path === "/checkouts")
    ).toBe(false)
  })

  it("blocks checkout when the provider's USD price differs from the advertised price", async () => {
    const fixture = dodoFixture()
    fixture.products.get("pdt_pro_monthly")!.price_detail = {
      ...(fixture.products.get("pdt_pro_monthly")!.price_detail as object),
      price: 1000,
    }
    await expect(loadCatalog(fixture.client)).rejects.toThrow(
      "does not match the plan"
    )
  })

  it("blocks checkout when a $0 checkout would skip the card", async () => {
    const fixture = dodoFixture()
    fixture.products.get("pdt_pro_monthly")!.price_detail = {
      ...(fixture.products.get("pdt_pro_monthly")!.price_detail as object),
      zero_amount_payment_method_optional: true,
    }
    await expect(loadCatalog(fixture.client)).rejects.toThrow(
      "a $0 checkout skips the card"
    )
  })

  it("refuses checkout when account-wide rounding changes the advertised price", async () => {
    const fixture = dodoFixture()
    fixture.state.quotedTotal = 899
    const provider = new DodoBillingProvider(() => fixture.client)
    await expect(provider.prepareCheckout("pro", "monthly")).rejects.toThrow(
      "checkout quote differs from the advertised USD price"
    )
    expect(
      fixture.requests.some((request) => request.path === "/checkouts")
    ).toBe(false)
  })

  it("refreshes archived subscription products even when the sales catalog is incomplete or repriced", async () => {
    const fixture = dodoFixture()
    const original = fixture.products.get("pdt_pro_monthly")!
    original.is_archived = true
    original.price_detail = {
      ...(original.price_detail as object),
      price: 1200,
    }
    fixture.products.delete("pdt_business_yearly")
    fixture.state.subscription = fixture.subscription({ status: "on_hold" })
    const provider = new DodoBillingProvider(() => fixture.client)
    expect(await provider.getSubscription("sub_1")).toMatchObject({
      plan: "pro",
      status: "on_hold",
    })
    expect(await provider.listSubscriptions("cus_1")).toMatchObject([
      { plan: "pro", status: "on_hold" },
    ])
    expect(
      fixture.requests.some((request) => request.path === "/products")
    ).toBe(false)
    await expect(provider.prepareCheckout("pro", "monthly")).rejects.toThrow(
      "has no product"
    )
  })

  it("ignores another app's products when reading subscriptions", async () => {
    const fixture = dodoFixture()
    fixture.products.set("pdt_assist", { metadata: { app: "assist" } })
    fixture.state.subscription = fixture.subscription({
      product_id: "pdt_assist",
    })
    expect(
      await new DodoBillingProvider(() => fixture.client).getSubscription(
        "sub_1"
      )
    ).toBeNull()
  })

  it("creates one USD-only product per plan and interval and reruns without duplicating them", async () => {
    const fixture = dodoFixture(false)
    await syncCatalog(fixture.client, () => {})
    await loadCatalog(fixture.client)
    await syncCatalog(fixture.client, () => {})
    expect(fixture.products.size).toBe(
      PLAN_IDS.length * BILLING_INTERVALS.length
    )
    expect([...fixture.rules.values()].flat()).toHaveLength(0)
    expect(
      fixture.requests.filter(
        (request) => request.method === "POST" && request.path === "/products"
      )
    ).toHaveLength(PLAN_IDS.length * BILLING_INTERVALS.length)
    expect(
      [...fixture.products.values()].every(
        (product) =>
          product.tax_category === "saas" && product.pricing_mode === null
      )
    ).toBe(true)
    expect(
      fixture.requests.some(
        (request) =>
          request.method === "POST" && request.path.includes("localized-prices")
      )
    ).toBe(false)
  })

  it("clears old country pricing without replacing the products, and reruns without updates", async () => {
    const fixture = dodoFixture()
    for (const [id, product] of fixture.products) {
      product.pricing_mode = "by_country"
      fixture.rules.set(id, [
        {
          id: `lcp_${id}`,
          mode: "by_country",
          country_code: "IN",
          currency: "INR",
          amount: 49900,
        },
      ])
    }
    await expect(loadCatalog(fixture.client)).rejects.toThrow(
      "localized pricing enabled"
    )
    await syncCatalog(fixture.client, () => {})
    await loadCatalog(fixture.client)
    expect(fixture.products.size).toBe(
      PLAN_IDS.length * BILLING_INTERVALS.length
    )
    expect([...fixture.rules.values()].flat()).toHaveLength(0)
    expect(
      fixture.requests.filter((request) => request.method === "PATCH")
    ).toHaveLength(PLAN_IDS.length * BILLING_INTERVALS.length)
    expect(
      fixture.requests.some(
        (request) => request.method === "POST" && request.path === "/products"
      )
    ).toBe(false)
    const mutations = fixture.requests.filter(
      (request) => request.method !== "GET"
    ).length
    await syncCatalog(fixture.client, () => {})
    expect(
      fixture.requests.filter((request) => request.method !== "GET")
    ).toHaveLength(mutations)
  })

  it("archives any remaining localized rules on a base-only product", async () => {
    const fixture = dodoFixture()
    fixture.rules.get("pdt_pro_monthly")!.push({
      id: "lcp_stale",
      mode: "by_currency",
      currency: "EUR",
      amount: 1000,
    })
    await syncCatalog(fixture.client, () => {})
    await loadCatalog(fixture.client)
    expect(fixture.rules.get("pdt_pro_monthly")).toEqual([])
    expect(
      fixture.requests.filter((request) => request.method === "DELETE")
    ).toMatchObject([
      { path: "/products/pdt_pro_monthly/localized-prices/lcp_stale" },
    ])
  })
})
