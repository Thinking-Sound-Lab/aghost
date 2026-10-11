-- Hold ownership across provider calls, which cannot share a PostgREST SQL
-- transaction. Claims never expire automatically: expiry could let a second
-- process race a slow provider write. Only the owner can release its claim.
create table public.workspace_operations (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  owner uuid not null,
  started_at timestamptz not null default now()
);
alter table public.workspace_operations enable row level security;
revoke all on public.workspace_operations from anon, authenticated, service_role;
grant select, insert, delete on public.workspace_operations to service_role;

create function public.claim_workspace_operation(p_workspace_id uuid, p_owner uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.workspace_operations (workspace_id, owner)
  values (p_workspace_id, p_owner) on conflict (workspace_id) do nothing;
  return exists (
    select 1 from public.workspace_operations
    where workspace_id = p_workspace_id and owner = p_owner
  );
end;
$$;

create function public.release_workspace_operation(p_workspace_id uuid, p_owner uuid)
returns void language sql security definer set search_path = ''
as $$
  delete from public.workspace_operations
  where workspace_id = p_workspace_id and owner = p_owner;
$$;
revoke all on function public.claim_workspace_operation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_workspace_operation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_workspace_operation(uuid, uuid) to service_role;
grant execute on function public.release_workspace_operation(uuid, uuid) to service_role;

-- Reserve before sending a checkout creation request. If the response or local
-- save is lost, the reservation remains and no second payable link is issued.
alter table public.workspace_billing
  add column checkout_plan text check (checkout_plan in ('pro', 'growth', 'business')),
  add column checkout_interval text check (checkout_interval in ('monthly', 'yearly')),
  add column checkout_requested_at timestamptz,
  add column checkout_session_id text unique,
  add column checkout_url text,
  add constraint workspace_billing_checkout_complete check (
    num_nulls(checkout_plan, checkout_interval, checkout_requested_at) in (0, 3)
    and num_nulls(checkout_session_id, checkout_url) in (0, 2)
    and (checkout_plan is not null or checkout_session_id is null)
  );
