-- Apply the event and complete its ledger entry in one transaction.
create function public.process_account_webhook(
  p_id text, p_type text, p_kind text, p_payload jsonb, p_account jsonb
)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_workspace uuid;
  v_outcome text := 'ignored';
  v_rows integer;
begin
  insert into public.webhook_events (id, type, payload, status)
  values (p_id, p_type, p_payload, 'received') on conflict (id) do nothing;
  select status into v_status from public.webhook_events where id = p_id for update;
  if v_status in ('processed', 'ignored') then return 'duplicate'; end if;

  if p_kind = 'account_connected' and p_account->>'platform' = 'instagram' then
    select id into v_workspace from public.workspaces
    where zernio_profile_id = p_account->>'providerProfileId';
    if v_workspace is not null then
      insert into public.instagram_accounts (
        workspace_id, zernio_account_id, username, display_name, status
      ) values (
        v_workspace, p_account->>'providerAccountId', p_account->>'username',
        p_account->>'displayName', 'connected'
      ) on conflict (zernio_account_id) do update set
        username = excluded.username, display_name = excluded.display_name,
        status = 'connected', disconnect_reason = null
      where public.instagram_accounts.workspace_id = excluded.workspace_id;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then v_outcome := 'processed'; end if;
    end if;
  elsif p_kind = 'account_disconnected' and p_account->>'platform' = 'instagram' then
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
alter table public.instagram_accounts add constraint instagram_accounts_workspace_identity_key
  unique (workspace_id, id);
alter table public.automations add constraint automations_account_workspace_fkey
  foreign key (workspace_id, instagram_account_id)
  references public.instagram_accounts (workspace_id, id) on delete cascade;
