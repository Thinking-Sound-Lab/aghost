-- Channels on Facebook, LinkedIn, X, Threads and YouTube next to Instagram.
--
-- Additive rollout: apply before the API. Every new column defaults to what
-- the previous API only ever wrote (Instagram), so it keeps working until the
-- new API replaces it. The table keeps its name for the same reason.

--------------------------------------------------------------------------------
-- instagram_accounts: every connected account, whatever its platform
--------------------------------------------------------------------------------

comment on table public.instagram_accounts is
  'Accounts connected through Zernio on every platform, named for the first one.';

alter table public.instagram_accounts
  add column platform text not null default 'instagram',
  add constraint instagram_accounts_platform_check check (
    platform in ('instagram', 'facebook', 'linkedin', 'twitter', 'threads', 'youtube')
  ),
  -- Lets posts and automations require the platform they were made for.
  add constraint instagram_accounts_id_platform_key unique (id, platform);

-- The product's own reasons no longer name Instagram.
update public.instagram_accounts
set disconnect_reason = 'Your plan has no room for another channel. Upgrade to reconnect it.'
where disconnect_reason = 'Your plan has no room for another Instagram account. Upgrade to reconnect it.';

update public.instagram_accounts
set disconnect_reason = 'Access expired or was revoked.'
where disconnect_reason = 'Instagram access expired or was revoked.';

--------------------------------------------------------------------------------
-- scheduled_posts: one row per account a post is published on
--------------------------------------------------------------------------------

alter table public.scheduled_posts
  add column platform text not null default 'instagram',
  add column youtube_title text,
  add column youtube_made_for_kids boolean,
  add constraint scheduled_posts_account_platform_fkey
    foreign key (instagram_account_id, platform)
    references public.instagram_accounts (id, platform) on delete cascade,
  -- Stories and Trial Reels exist only on Instagram.
  add constraint scheduled_posts_instagram_features_check check (
    platform = 'instagram' or (kind = 'post' and trial_graduation_strategy is null)
  ),
  add constraint scheduled_posts_youtube_check check (
    (platform = 'youtube') = (youtube_title is not null)
    and (youtube_title is null) = (youtube_made_for_kids is null)
    and char_length(youtube_title) between 1 and 100
  ),
  drop constraint scheduled_posts_caption_length,
  add constraint scheduled_posts_caption_length
    check (char_length(caption) between 1 and 63206),
  -- Text alone is a post everywhere but Instagram and YouTube.
  drop constraint scheduled_posts_media_check,
  add constraint scheduled_posts_media_check check (
    jsonb_typeof(media) = 'array'
    and jsonb_array_length(media) <= 10
    and (caption is not null or jsonb_array_length(media) > 0)
    and (platform not in ('instagram', 'youtube') or jsonb_array_length(media) > 0)
  );

--------------------------------------------------------------------------------
-- automations: comment-to-DM runs on Instagram accounts only
--------------------------------------------------------------------------------

alter table public.automations
  add column account_platform text not null default 'instagram',
  add constraint automations_account_platform_check
    check (account_platform = 'instagram'),
  add constraint automations_account_platform_fkey
    foreign key (instagram_account_id, account_platform)
    references public.instagram_accounts (id, platform) on delete cascade;

--------------------------------------------------------------------------------
-- Plans: Postiz's four tiers, with channels on every platform counted together
--------------------------------------------------------------------------------

alter table public.workspace_billing
  drop constraint workspace_billing_plan_check,
  add constraint workspace_billing_plan_check
    check (plan in ('pro', 'growth', 'business', 'ultimate')),
  drop constraint workspace_billing_checkout_plan_check,
  add constraint workspace_billing_checkout_plan_check
    check (checkout_plan in ('pro', 'growth', 'business', 'ultimate'));

create or replace function private.limit_instagram_connections()
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
  select case plan
    when 'pro' then 5 when 'growth' then 10 when 'business' then 30
    when 'ultimate' then 100
  end
  into v_limit from public.workspace_billing
  where workspace_id = new.workspace_id and status in ('active', 'past_due');

  select count(*) into v_count from public.instagram_accounts
  where workspace_id = new.workspace_id and status = 'connected';

  if v_count >= coalesce(v_limit, 0) then
    new.status := 'disconnected';
    new.disconnect_reason := 'Your plan has no room for another channel. Upgrade to reconnect it.';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_instagram_connections() from public, anon, authenticated;

-- Ultimate includes follow-up nudges, as Business does.
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
      join public.workspaces w on w.id = au.workspace_id
      join public.workspace_billing b on b.workspace_id = au.workspace_id
      where au.zernio_automation_id = p_automation_id and ac.zernio_account_id = p_account_id
        and w.zernio_profile_id = p_profile_id and ac.status = 'connected'
        and au.status = 'active' and au.follow_up is not null
        and b.status in ('active', 'past_due') and b.plan in ('business', 'ultimate')
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
        and j.status in ('pending', 'processing') and j.delivery_receipt is null and p_sent_at > j.source_sent_at;
    if found then outcome := 'processed'; end if;
  end if;
  update public.webhook_events set status = outcome, processed_at = now() where id = p_id;
  return outcome;
end;
$$;


--------------------------------------------------------------------------------
-- Account webhooks: connections and disconnections on every platform
--------------------------------------------------------------------------------

create or replace function public.process_account_webhook(
  p_id text, p_type text, p_kind text, p_payload jsonb, p_account jsonb
)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
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
    select id into v_workspace from public.workspaces
    where zernio_profile_id = p_account->>'providerProfileId';
    if v_workspace is not null then
      insert into public.instagram_accounts (
        workspace_id, zernio_account_id, platform, username, display_name, status
      ) values (
        v_workspace, p_account->>'providerAccountId', p_account->>'platform',
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
revoke all on function public.process_account_webhook(text, text, text, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.process_account_webhook(text, text, text, jsonb, jsonb)
to service_role;
