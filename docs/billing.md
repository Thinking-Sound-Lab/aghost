# Pricing and billing

Every plan includes MCP and REST API access, the dashboard, and the current Instagram automation features, with unlimited automations, contacts and DMs within Instagram's limits and fair use. Plans differ by connected Instagram accounts, never by contacts or messages. There is no free plan or trial in the billing catalog.

| Plan     | Accounts | Monthly | Yearly |
| -------- | -------- | ------- | ------ |
| Pro      | 1        | $9      | $108   |
| Growth   | 2        | $19     | $228   |
| Business | 5        | $49     | $588   |

All countries, including India, pay in US dollars. Prices include tax. Yearly billing costs twelve months, paid upfront. The plan definitions in `packages/api/src/contract/billing.ts` are shared with the UI; the backend validates Dodo's catalog against them before checkout.

## Dodo setup

1. Set `DODO_PAYMENTS_ENVIRONMENT=test_mode` and `DODO_PAYMENTS_API_KEY` in the root `.env`.
2. Run `pnpm billing:setup`. It creates or updates six recurring SaaS products, tagged by plan and interval. Each product has a USD base price, tax-inclusive pricing, no trial and no automatic country discounts. Reruns reuse the tagged products and archive all country and currency overrides. Duplicate product tags are refused. Disable Charm Pricing under Dodo's Settings → Business so checkout uses the exact advertised amounts. This is a business-wide setting that also affects other products in that business; the setup script does not change it.
3. Run `pnpm local:tunnel`. It registers a Dodo test-mode endpoint, stores its signing secret in `DODO_PAYMENTS_WEBHOOK_KEY`, and recreates the Docker API with it. The tunnel exposes only `/api/webhooks/zernio` and `/api/webhooks/dodo`.
4. Run `pnpm dev`, sign in, and open Settings → Plan and Billing. Choose a plan to open hosted checkout. Use Dodo's [test payment methods](https://docs.dodopayments.com/features/payment-methods/india#testing).

For production, create the catalog in `live_mode` with that mode's API key. Explicit exported settings override the root `.env` in both billing commands. Register `https://<ApiUrl>/api/webhooks/dodo` in Dodo and subscribe to subscription events plus `payment.succeeded`, `payment.failed`, `payment.cancelled`, and `payment.processing`. Add all three Dodo values to the existing `aghost/prod/api` Secrets Manager JSON **before deploying the changed ECS task definition**. Use empty key/secret strings if billing is intentionally unavailable. Apply `20261011090000_workspace_billing.sql` and `20261011100000_billing_coordination.sql` before releasing the API.

Stop the previous API's writers during the initial billing rollout. With the migrated database, matching Zernio credentials and the correct Dodo mode configured, run `pnpm billing:reconcile` before reopening traffic to the new API. It collects every workspace with active automation rows and applies the webhook policy: paid workspaces within their account limit keep running; workspaces without a customer or subscription, ended plans and over-limit plans are paused at Zernio and in Postgres. A provider failure makes the command fail, and a rerun retries the remaining active rows. No workspace is implicitly grandfathered into a free plan.

Checkout requests USD and disables currency selection, so every country pays in USD even if Adaptive Currency is enabled in the Dodo account. Before creating a session, the backend checks Dodo's USD checkout quote against the advertised initial and recurring amounts and refuses checkout if account settings such as Charm Pricing change them. Pricing does not depend on hosting geolocation or country headers. Customers enter their billing address at checkout; Dodo uses it to calculate the tax included in the price. Confirm both India and non-India hosted checkouts in the configured Dodo account before releasing billing.

See [Adaptive Currency](https://docs.dodopayments.com/features/adaptive-currency), [tax-inclusive pricing](https://docs.dodopayments.com/features/tax-inclusive-pricing), and [India payment methods](https://docs.dodopayments.com/features/payment-methods/india). UPI requires INR billing and is unavailable with this USD-only catalog. Updating the catalog applies to new subscriptions; it does not change the price of existing subscriptions.

## Subscription lifecycle

- Only the authenticated workspace owner can start checkout, change plans, or open the billing portal. API keys and MCP do not expose billing mutations. Payer details come from the authenticated identity, and the backend fixes all return URLs.
- Each workspace has one durable checkout reservation. Retries resume its unpaid session for the same plan and interval. A different choice is refused while that link can still be paid. Replacement requires expiry of Dodo's [24-hour, single-use checkout](https://docs.dodopayments.com/features/checkout) and a settled payment state; processing payments remain reserved past link expiry. Checkout creation is reserved before the provider write and automatic SDK retries are disabled. A lost response or failed local save keeps the reservation for reconciliation, rather than issuing a second payable link.
- Checkout return and Manage billing return open Settings → Plan and Billing. The UI reconciles with Dodo; it does not trust redirect query parameters. Customers can also refresh billing manually.
- Pricing cards preserve the plan and monthly/yearly selection through Google sign-in and initialize billing with that choice. These parameters select the UI only; they do not authorize payment or access.
- Webhooks verify the raw body with Standard Webhooks, including timestamp freshness. Subscription and payment events cause a read of Dodo's current subscription and payment records. Redeliveries and delayed events converge to the current state.
- Database ownership serializes checkout, subscription reads and saves, plan changes, account sync/removal, and automation writes per workspace across API instances. Billing and account webhooks locate the workspace first, then apply their changes under ownership. A plan shutdown waits for an in-flight activation, then pauses its result; an activation after shutdown fails its plan check.
- Existing subscription products are resolved independently by their metadata, including archived or repriced products. A missing or mismatched sales SKU still blocks new sales, but does not block cancellation or on-hold updates for another subscription.
- An initial active mandate does not grant access until Dodo reports a successful, nonzero payment belonging to that subscription and customer. Indian payments can remain processing for about 48 hours. Existing paid subscriptions retain Dodo's `past_due` grace period and stop on `on_hold`, `paused`, cancellation, failure or expiry.
- Plan changes charge prorated amounts immediately and use `prevent_change` on payment failure. A returned payment approval URL is forwarded to the browser. Access reflects the provider's actual product after payment, not the requested product.
- The application blocks a downgrade while too many accounts are connected. A downgrade performed in Dodo's portal is still reconciled; automations are paused if it exceeds the new limit. They must be turned on again after the owner disconnects accounts or upgrades.
- Account callbacks hold the same workspace ownership as billing across provider reads, database saves and rejected-account cleanup. The database trigger also checks new connections against the current plan. A downgrade sees completed callbacks before counting accounts; an upgrade and reconnection wait for old provider cleanup. A connection exceeding the plan is stored as disconnected and removed from Zernio. A failed provider disconnect is retried when the webhook is redelivered, even if the database event was already committed; the rejection is rechecked under ownership so a duplicate cannot remove an account that has since been allowed.
- When the plan ends, the backend fetches every automation page, including older rows beyond Supabase's 1,000-row response limit, and pauses running automations at Zernio before marking them paused locally. Failed pauses fail the webhook request so Dodo can retry. The subscription is kept for payment recovery; accounts, drafts, contacts and history remain visible.

## Recovery after interrupted provider operations

Workspace ownership deliberately does not expire automatically: an older process might still be writing to Zernio or Dodo. Normal success and errors release ownership. A crashed process or a failed release leaves a row in `workspace_operations`; later mutations return a retryable conflict instead of overlapping it. After stopping the old process and checking its provider writes, use a service-role connection to release only the observed claim with `release_workspace_operation(workspace_id, owner)`, then rerun billing reconciliation. Do not release a claim solely because it is old.

If `workspace_billing.checkout_plan` is set but `checkout_session_id` is null, a checkout creation response or save was lost. Check that customer's Dodo sessions and subscriptions before retrying. Restore the original session id and URL when available, or clear the checkout columns only after confirming that any issued link has expired and no payment or subscription is unsettled. Do not clear a reservation just to change the selected plan. Failed pricing validation happens before reservation, so correcting the sales catalog or Charm Pricing configuration needs no checkout recovery.

## Verification

`pnpm setup:test` starts this project's local Supabase and applies pending migrations without resetting data. `pnpm verify` runs typecheck, lint, tests, and the production build. Billing tests use the installed Dodo SDK with an in-process fixture transport, plus real local Postgres/Auth for the HTTP lifecycle, tenancy, checkout deduplication, stale subscription reads, activation/shutdown ordering, legacy reconciliation and concurrent account limits. They never call a live payment provider. A configured hosted checkout and actual sandbox payment must still be verified with Dodo credentials.
