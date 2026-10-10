-- Each workspace's Dodo Payments customer and the subscription that decides
-- its plan. Rows are written only by the backend, from Dodo's own API, after
-- checkout and on every subscription webhook.
create table public.workspace_billing (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  dodo_customer_id text not null,
  -- The subscription columns are all set together, once there is one.
  dodo_subscription_id text,
  plan text,
  billing_interval text,
  status text,
  currency text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  subscription_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_billing_dodo_customer_id_key unique (dodo_customer_id),
  constraint workspace_billing_dodo_subscription_id_key unique (dodo_subscription_id),
  constraint workspace_billing_subscription_complete check (
    num_nulls(
      dodo_subscription_id, plan, billing_interval, status, currency,
      current_period_end, cancel_at_period_end, subscription_created_at
    ) in (0, 8)
  ),
  constraint workspace_billing_plan_check
    check (plan in ('pro', 'growth', 'business')),
  constraint workspace_billing_interval_check
    check (billing_interval in ('monthly', 'yearly')),
  constraint workspace_billing_status_check check (
    status in (
      'pending', 'active', 'past_due', 'on_hold', 'paused', 'cancelled',
      'failed', 'expired'
    )
  ),
  constraint workspace_billing_currency_check check (currency in ('INR', 'USD'))
);

create trigger workspace_billing_set_updated_at
  before update on public.workspace_billing
  for each row execute function private.set_updated_at();

alter table public.workspace_billing enable row level security;
revoke all on table public.workspace_billing from anon, authenticated, service_role;
grant select on table public.workspace_billing to authenticated;
grant select, insert, update, delete on table public.workspace_billing to service_role;

create policy "Owners can read their workspace's billing"
  on public.workspace_billing
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

-- OAuth callbacks and account.connected webhooks may arrive concurrently.
-- Serialize new connections per workspace, including reconnections, and keep
-- rejected accounts visible as disconnected until the backend removes them
-- from Zernio. Existing connections can still be read and disconnected after
-- a plan ends; billing webhooks separately pause their automations.
create function private.limit_instagram_connections()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_limit integer := 0;
  v_count integer;
begin
  if new.status <> 'connected' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'connected' and old.workspace_id = new.workspace_id then
      return new;
    end if;
  end if;

  perform 1 from public.workspaces where id = new.workspace_id for update;
  select case plan when 'pro' then 1 when 'growth' then 2 when 'business' then 5 end
  into v_limit from public.workspace_billing
  where workspace_id = new.workspace_id and status in ('active', 'past_due');

  select count(*) into v_count from public.instagram_accounts
  where workspace_id = new.workspace_id and status = 'connected';

  if v_count >= coalesce(v_limit, 0) then
    new.status := 'disconnected';
    new.disconnect_reason := 'Your plan has no room for another Instagram account. Upgrade to reconnect it.';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_instagram_connections() from public, anon, authenticated;

create trigger instagram_accounts_plan_limit
  before insert or update of status, workspace_id on public.instagram_accounts
  for each row execute function private.limit_instagram_connections();
