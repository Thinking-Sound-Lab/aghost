-- Social sets: one account on each platform, grouped like a brand.
--
-- Plans include social sets instead of channels: Pro 1, Growth 2, Business 10.
-- Each set has its own Zernio profile, since a profile holds one YouTube
-- channel. Additive rollout: apply before the API. The previous API keeps
-- working: the first set takes the workspace's profile, and an account stored
-- without a set joins the first one.

--------------------------------------------------------------------------------
-- social_sets
--------------------------------------------------------------------------------

create table public.social_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  -- Created with the set's first connection.
  zernio_profile_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_sets_name_length check (char_length(name) between 1 and 60),
  constraint social_sets_zernio_profile_id_key unique (zernio_profile_id),
  -- Lets accounts require a set of their own workspace.
  constraint social_sets_id_workspace_key unique (id, workspace_id)
);

create index social_sets_workspace_id_idx
  on public.social_sets (workspace_id, created_at);

create trigger social_sets_set_updated_at
  before update on public.social_sets
  for each row execute function private.set_updated_at();

alter table public.social_sets enable row level security;
revoke all on table public.social_sets from anon, authenticated, service_role;
grant select on table public.social_sets to authenticated;
grant select, insert, update, delete on table public.social_sets to service_role;

create policy "Owners can read their workspace's social sets"
  on public.social_sets
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

-- Every workspace starts with one set, holding the profile it already has.
insert into public.social_sets (workspace_id, name, zernio_profile_id)
select id, 'Social set 1', zernio_profile_id from public.workspaces;

create function private.create_first_social_set()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.social_sets (workspace_id, name, zernio_profile_id)
  values (new.id, 'Social set 1', new.zernio_profile_id);
  return new;
end;
$$;
revoke all on function private.create_first_social_set() from public, anon, authenticated;

create trigger workspaces_first_social_set
  after insert on public.workspaces
  for each row execute function private.create_first_social_set();

-- The previous API gives the workspace a profile on its first connection.
create function private.share_workspace_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.social_sets set zernio_profile_id = new.zernio_profile_id
  where id = (
    select id from public.social_sets where workspace_id = new.id
    order by created_at, id limit 1
  ) and zernio_profile_id is null;
  return new;
end;
$$;
revoke all on function private.share_workspace_profile() from public, anon, authenticated;

create trigger workspaces_share_profile
  after update of zernio_profile_id on public.workspaces
  for each row when (new.zernio_profile_id is not null)
  execute function private.share_workspace_profile();

--------------------------------------------------------------------------------
-- instagram_accounts: every account belongs to a set
--------------------------------------------------------------------------------

alter table public.instagram_accounts
  add column social_set_id uuid,
  -- Set on accounts that shared a platform before sets, all of which went to
  -- the first set. They may reconnect there; no other account may share.
  add column shared_platform_before_sets boolean not null default false;

update public.instagram_accounts a set social_set_id = s.id
from public.social_sets s where s.workspace_id = a.workspace_id;

update public.instagram_accounts a set shared_platform_before_sets = true
where exists (
  select 1 from public.instagram_accounts other
  where other.workspace_id = a.workspace_id and other.platform = a.platform
    and other.id <> a.id
);

alter table public.instagram_accounts
  alter column social_set_id set not null,
  add constraint instagram_accounts_social_set_fkey
    foreign key (social_set_id, workspace_id)
    references public.social_sets (id, workspace_id);

create index instagram_accounts_social_set_id_idx
  on public.instagram_accounts (social_set_id, platform);

-- Runs before the plan limit, which reads the set: triggers fire by name.
create function private.default_social_set()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.social_set_id is null then
    select id into new.social_set_id from public.social_sets
    where workspace_id = new.workspace_id order by created_at, id limit 1;
  end if;
  return new;
end;
$$;
revoke all on function private.default_social_set() from public, anon, authenticated;

create trigger instagram_accounts_default_social_set
  before insert on public.instagram_accounts
  for each row execute function private.default_social_set();

--------------------------------------------------------------------------------
-- Plans: Pro, Growth and Business, by social set
--------------------------------------------------------------------------------

-- Ultimate was never sold, though a test database may hold it.
update public.workspace_billing set plan = 'business' where plan = 'ultimate';
update public.workspace_billing set checkout_plan = 'business'
where checkout_plan = 'ultimate';

alter table public.workspace_billing
  drop constraint workspace_billing_plan_check,
  add constraint workspace_billing_plan_check
    check (plan in ('pro', 'growth', 'business')),
  drop constraint workspace_billing_checkout_plan_check,
  add constraint workspace_billing_checkout_plan_check
    check (checkout_plan in ('pro', 'growth', 'business'));

create function private.social_set_limit(p_workspace uuid)
returns integer language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case plan when 'pro' then 1 when 'growth' then 2 when 'business' then 10 end
    from public.workspace_billing
    where workspace_id = p_workspace and status in ('active', 'past_due')
  ), 0);
$$;
revoke all on function private.social_set_limit(uuid) from public, anon, authenticated;

-- Every workspace has its first set, so only further ones need room.
create function private.limit_social_sets()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  perform 1 from public.workspaces where id = new.workspace_id for update;
  select count(*) into v_count from public.social_sets
  where workspace_id = new.workspace_id;
  if v_count > 0 and v_count >= private.social_set_limit(new.workspace_id) then
    raise exception 'The plan has no room for another social set.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_social_sets() from public, anon, authenticated;

create trigger social_sets_plan_limit
  before insert on public.social_sets
  for each row execute function private.limit_social_sets();

create or replace function private.limit_instagram_connections()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_limit integer;
  v_sets integer;
begin
  if new.status <> 'connected' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'connected' and old.workspace_id = new.workspace_id then
      return new;
    end if;
  end if;

  perform 1 from public.workspaces where id = new.workspace_id for update;
  v_limit := private.social_set_limit(new.workspace_id);
  select count(*) into v_sets from public.social_sets
  where workspace_id = new.workspace_id;

  if v_limit = 0 or v_sets > v_limit then
    new.status := 'disconnected';
    new.disconnect_reason := 'Your plan has no room for another channel. Upgrade to reconnect it.';
  -- A set holds one connected account on each platform, whether the account
  -- is new or connecting again. Accounts that shared a platform before sets
  -- keep doing so.
  elsif not new.shared_platform_before_sets and exists (
    select 1 from public.instagram_accounts
    where social_set_id = new.social_set_id and platform = new.platform
      and status = 'connected' and id <> new.id
  ) then
    new.status := 'disconnected';
    new.disconnect_reason := 'This social set already has an account on this platform. Connect it to another set.';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_instagram_connections() from public, anon, authenticated;

--------------------------------------------------------------------------------
-- Webhooks find the workspace through the set that owns the profile
--------------------------------------------------------------------------------

create or replace function public.process_follow_up_webhook(
  p_id text, p_type text, p_payload jsonb, p_account_id text, p_profile_id text,
  p_recipient_id text, p_conversation_id text, p_message_id text,
  p_automation_id text, p_sent_at timestamptz
) returns text language plpgsql security definer set search_path = '' as $$
declare
  a public.automations%rowtype;
  outcome text := 'ignored';
begin
  insert into public.webhook_events(id, type, payload, status)
  values(p_id, p_type, p_payload, 'received') on conflict do nothing;
  if not found then return 'duplicate'; end if;

  if p_type = 'message.sent' then
    select au.* into a from public.automations au
      join public.instagram_accounts ac on ac.id = au.instagram_account_id and ac.workspace_id = au.workspace_id
      join public.social_sets s on s.id = ac.social_set_id
      join public.workspace_billing b on b.workspace_id = au.workspace_id
      where au.zernio_automation_id = p_automation_id and ac.zernio_account_id = p_account_id
        and s.zernio_profile_id = p_profile_id and ac.status = 'connected'
        and au.status = 'active' and au.follow_up is not null
        and b.status in ('active', 'past_due') and b.plan = 'business'
        and p_sent_at >= au.updated_at
        and p_sent_at > now() - interval '24 hours'
        and p_sent_at <= now() + interval '1 minute'
      for share of au;
    if found then
      insert into public.follow_up_jobs(
        automation_id, workspace_id, provider_account_id, recipient_id, conversation_id,
        provider_message_id, source_sent_at, automation_updated_at, follow_up, due_at, retry_after, recipient_name
      ) values (
        a.id, a.workspace_id, p_account_id, p_recipient_id, p_conversation_id,
        p_message_id, p_sent_at, a.updated_at, a.follow_up,
        p_sent_at + make_interval(mins => (a.follow_up->>'delayMinutes')::integer),
        p_sent_at + make_interval(mins => (a.follow_up->>'delayMinutes')::integer),
        coalesce(p_payload->'conversation'->>'participantUsername', p_payload->'conversation'->>'participantName')
      ) on conflict do nothing;
      outcome := 'processed';
    end if;
  elsif p_type = 'message.received' then
    update public.follow_up_jobs j set status = 'cancelled', reason = 'replied', lease_owner = null, lease_until = null
      from public.social_sets s
      where s.workspace_id = j.workspace_id and s.zernio_profile_id = p_profile_id
        and j.provider_account_id = p_account_id and j.recipient_id = p_recipient_id
        and j.status in ('pending', 'processing') and j.delivery_receipt is null and p_sent_at > j.source_sent_at;
    if found then outcome := 'processed'; end if;
  end if;
  update public.webhook_events set status = outcome, processed_at = now() where id = p_id;
  return outcome;
end;
$$;

create or replace function public.process_account_webhook(
  p_id text, p_type text, p_kind text, p_payload jsonb, p_account jsonb
)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_set uuid;
  v_workspace uuid;
  v_outcome text := 'ignored';
  v_rows integer;
  v_supported boolean := p_account->>'platform' in (
    'instagram', 'facebook', 'linkedin', 'twitter', 'threads', 'youtube'
  );
begin
  insert into public.webhook_events (id, type, payload, status)
  values (p_id, p_type, p_payload, 'received') on conflict (id) do nothing;
  select status into v_status from public.webhook_events where id = p_id for update;
  if v_status in ('processed', 'ignored') then return 'duplicate'; end if;

  if p_kind = 'account_connected' and v_supported then
    select id, workspace_id into v_set, v_workspace from public.social_sets
    where zernio_profile_id = p_account->>'providerProfileId';
    if v_workspace is not null then
      insert into public.instagram_accounts (
        workspace_id, social_set_id, zernio_account_id, platform, username,
        display_name, status
      ) values (
        v_workspace, v_set, p_account->>'providerAccountId', p_account->>'platform',
        p_account->>'username', p_account->>'displayName', 'connected'
      ) on conflict (zernio_account_id) do update set
        username = excluded.username, display_name = excluded.display_name,
        status = 'connected', disconnect_reason = null
      where public.instagram_accounts.workspace_id = excluded.workspace_id;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then v_outcome := 'processed'; end if;
    end if;
  elsif p_kind = 'account_disconnected' and v_supported then
    update public.instagram_accounts set status = 'disconnected',
      disconnect_reason = p_account->>'reason'
    where zernio_account_id = p_account->>'providerAccountId';
    get diagnostics v_rows = row_count;
    if v_rows > 0 then v_outcome := 'processed'; end if;
  end if;
  update public.webhook_events set status = v_outcome, error = null,
    processed_at = now() where id = p_id;
  return v_outcome;
end;
$$;
