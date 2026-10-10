-- Initial schema: workspaces, connected Instagram accounts, comment-to-DM
-- automations and the inbound webhook ledger.
--
-- Access model
--   * Signed-in users may only READ rows that belong to their workspace (RLS).
--   * Every write is performed by the backend (packages/api) with the secret
--     key, after it has verified the caller and, where relevant, the provider.
--     The provider pointer columns (zernio_*_id) decide which remote resource
--     the backend acts on, so they must never be writable from a browser.

create schema if not exists private;

comment on schema private is
  'Internal helpers. Not exposed through the Data API.';

--------------------------------------------------------------------------------
-- Helpers
--------------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

--------------------------------------------------------------------------------
-- workspaces: one per user, the tenant every other row hangs off
--------------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- Zernio profile that holds this workspace's connected accounts. Null until
  -- the workspace connects its first account.
  zernio_profile_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_owner_id_key unique (owner_id),
  constraint workspaces_zernio_profile_id_key unique (zernio_profile_id),
  constraint workspaces_name_length check (char_length(name) between 1 and 80)
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function private.set_updated_at();

--------------------------------------------------------------------------------
-- instagram_accounts: Instagram accounts connected through Zernio
--------------------------------------------------------------------------------

create table public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  zernio_account_id text not null,
  username text not null,
  display_name text,
  profile_picture_url text,
  status text not null,
  disconnect_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instagram_accounts_zernio_account_id_key unique (zernio_account_id),
  constraint instagram_accounts_status_check
    check (status in ('connected', 'disconnected')),
  constraint instagram_accounts_disconnect_reason_check
    check (status = 'disconnected' or disconnect_reason is null)
);

create index instagram_accounts_workspace_id_idx
  on public.instagram_accounts (workspace_id);

create trigger instagram_accounts_set_updated_at
  before update on public.instagram_accounts
  for each row execute function private.set_updated_at();

--------------------------------------------------------------------------------
-- automations: comment-to-DM automations, mirrored from Zernio
--------------------------------------------------------------------------------

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  instagram_account_id uuid not null
    references public.instagram_accounts (id) on delete cascade,
  zernio_automation_id text not null,
  name text not null,
  status text not null,
  -- Trigger: which post, and which comments on it.
  post_scope text not null,
  platform_post_id text,
  post_caption text,
  post_permalink text,
  keywords text[] not null default '{}',
  match_mode text not null,
  -- Response: the DM, its link buttons and the optional public reply.
  dm_message text not null,
  dm_buttons jsonb not null default '[]'::jsonb,
  comment_reply text,
  require_follow boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automations_zernio_automation_id_key unique (zernio_automation_id),
  constraint automations_name_length check (char_length(name) between 1 and 80),
  constraint automations_status_check check (status in ('active', 'paused')),
  constraint automations_post_scope_check
    check (post_scope in ('specific_post', 'any_post')),
  constraint automations_specific_post_check
    check ((post_scope = 'specific_post') = (platform_post_id is not null)),
  constraint automations_match_mode_check
    check (match_mode in ('contains', 'word', 'exact')),
  constraint automations_dm_buttons_check
    check (jsonb_typeof(dm_buttons) = 'array' and jsonb_array_length(dm_buttons) <= 3)
);

create index automations_workspace_id_idx on public.automations (workspace_id);

create index automations_instagram_account_id_idx
  on public.automations (instagram_account_id);

create trigger automations_set_updated_at
  before update on public.automations
  for each row execute function private.set_updated_at();

--------------------------------------------------------------------------------
-- webhook_events: ledger of inbound Zernio events, keyed by the event id so a
-- redelivered event is recognised and handled at most once
--------------------------------------------------------------------------------

create table public.webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  status text not null,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_events_status_check
    check (status in ('received', 'processed', 'ignored', 'failed'))
);

--------------------------------------------------------------------------------
-- Every new user gets a workspace
--------------------------------------------------------------------------------

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, 'My workspace');
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

--------------------------------------------------------------------------------
-- Privileges and row level security
--------------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.instagram_accounts enable row level security;
alter table public.automations enable row level security;
alter table public.webhook_events enable row level security;

-- Start from nothing so the result does not depend on the project's default
-- privileges, then grant exactly what each role needs.
revoke all on table
  public.workspaces,
  public.instagram_accounts,
  public.automations,
  public.webhook_events
from anon, authenticated, service_role;

grant select on table
  public.workspaces,
  public.instagram_accounts,
  public.automations
to authenticated;

grant select, insert, update, delete on table
  public.workspaces,
  public.instagram_accounts,
  public.automations,
  public.webhook_events
to service_role;

create policy "Owners can read their workspace"
  on public.workspaces
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can read their workspace's Instagram accounts"
  on public.instagram_accounts
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

create policy "Owners can read their workspace's automations"
  on public.automations
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

-- webhook_events has no policies: only the backend (service_role) reads or
-- writes it.
