-- Until the first charge after a workspace's free trial succeeds, when the
-- trial ends. Kept while that charge is on hold. Null otherwise, including for
-- every subscription bought before trials.
alter table public.workspace_billing
  add column trial_ends_at timestamptz,
  add constraint workspace_billing_trial_has_subscription
    check (trial_ends_at is null or dodo_subscription_id is not null);
