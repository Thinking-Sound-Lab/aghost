-- While a workspace's first subscription is in its free trial, when the trial
-- ends and the card is first charged. Null otherwise, including for every
-- subscription bought before trials.
alter table public.workspace_billing
  add column trial_ends_at timestamptz,
  add constraint workspace_billing_trial_has_subscription
    check (trial_ends_at is null or dodo_subscription_id is not null);
