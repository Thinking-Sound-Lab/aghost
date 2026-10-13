-- Additive rollout: apply before the API. Older clients can keep using text DMs.
alter table public.automations
  add column product_carousel jsonb,
  add column follow_up jsonb,
  add constraint automations_carousel_check check (
    product_carousel is null or
    (jsonb_typeof(product_carousel) = 'array' and
     jsonb_array_length(product_carousel) between 1 and 10 and dm_buttons = '[]'::jsonb)
  ),
  add constraint automations_follow_up_check check (
    follow_up is null or
    (jsonb_typeof(follow_up) = 'object' and
     (follow_up->>'delayMinutes')::integer between 30 and 1200 and
     char_length(follow_up->>'message') between 1 and 640)
  );

create table public.follow_up_jobs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_account_id text not null,
  recipient_id text not null,
  recipient_name text,
  conversation_id text not null,
  provider_message_id text not null,
  source_sent_at timestamptz not null,
  automation_updated_at timestamptz not null,
  follow_up jsonb not null,
  due_at timestamptz not null,
  retry_after timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  attempts integer not null default 0,
  lease_owner uuid,
  lease_until timestamptz,
  reason text,
  provider_log_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (automation_id, provider_message_id)
);
create index follow_up_jobs_due_idx on public.follow_up_jobs(retry_after)
  where status in ('pending', 'processing');
create index follow_up_jobs_automation_idx on public.follow_up_jobs(automation_id);
create index follow_up_jobs_recipient_idx on public.follow_up_jobs(provider_account_id, recipient_id)
  where status in ('pending', 'processing');

alter table public.follow_up_jobs enable row level security;
revoke all on public.follow_up_jobs from anon, authenticated, service_role;
grant select, insert, update, delete on public.follow_up_jobs to service_role;
grant select on public.follow_up_jobs to authenticated;
create policy follow_up_jobs_owner_read on public.follow_up_jobs for select to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

-- The signed provider event, tenant lookup, job and ledger entry commit together.
create function public.process_follow_up_webhook(
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
      join public.workspaces w on w.id = au.workspace_id
      join public.workspace_billing b on b.workspace_id = au.workspace_id
      where au.zernio_automation_id = p_automation_id and ac.zernio_account_id = p_account_id
        and w.zernio_profile_id = p_profile_id and ac.status = 'connected'
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
      from public.workspaces w
      where w.id = j.workspace_id and w.zernio_profile_id = p_profile_id
        and j.provider_account_id = p_account_id and j.recipient_id = p_recipient_id
        and j.status in ('pending', 'processing') and p_sent_at > j.source_sent_at;
    if found then outcome := 'processed'; end if;
  end if;
  update public.webhook_events set status = outcome, processed_at = now() where id = p_id;
  return outcome;
end;
$$;
revoke all on function public.process_follow_up_webhook(text, text, jsonb, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.process_follow_up_webhook(text, text, jsonb, text, text, text, text, text, text, timestamptz) to service_role;

-- Leases survive restarts. Provider sends also carry a stable idempotency key.
create function public.claim_follow_up_jobs(p_owner uuid, p_limit integer default 20)
returns setof public.follow_up_jobs language sql security definer set search_path = '' as $$
  with due as materialized (
    select q.id from public.follow_up_jobs q
    where q.retry_after <= now() and
      (q.status = 'pending' or (q.status = 'processing' and q.lease_until < now()))
    order by q.retry_after, q.id for update skip locked limit greatest(1, least(p_limit, 100))
  )
  update public.follow_up_jobs j set status = 'processing', lease_owner = p_owner,
    lease_until = now() + interval '5 minutes', attempts = j.attempts + 1
  from due where j.id = due.id returning j.*;
$$;
revoke all on function public.claim_follow_up_jobs(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_follow_up_jobs(uuid, integer) to service_role;

-- A paused/edited automation must never send its old pending reminders.
create function private.cancel_changed_follow_ups() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.follow_up_jobs set status = 'cancelled', reason = 'automation_changed', lease_owner = null, lease_until = null
    where automation_id = new.id and status in ('pending', 'processing');
  return new;
end;
$$;
revoke all on function private.cancel_changed_follow_ups() from public, anon, authenticated;
create trigger automations_cancel_follow_ups after update on public.automations
  for each row execute function private.cancel_changed_follow_ups();
