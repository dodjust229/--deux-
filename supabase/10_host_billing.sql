-- QSPICY host accounts and prepaid access
-- No client-side writes to payment or subscription records. Only trusted Edge Functions use service_role.

create table if not exists public.host_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  provider text not null default 'fedapay' check (provider = 'fedapay'),
  provider_transaction_id text unique,
  amount integer not null default 750 check (amount = 750),
  currency text not null default 'XOF' check (currency = 'XOF'),
  status text not null default 'pending' check (status in ('pending','approved','declined','canceled','refunded')),
  payment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (user_id, idempotency_key)
);

create table if not exists public.host_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null unique references public.host_payments(id) on delete restrict,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint host_subscription_period_valid check (expires_at > starts_at)
);

create index if not exists host_payments_user_created_idx
  on public.host_payments(user_id, created_at desc);
create index if not exists host_subscriptions_user_expiry_idx
  on public.host_subscriptions(user_id, expires_at desc)
  where status = 'active';

alter table public.host_payments enable row level security;
alter table public.host_subscriptions enable row level security;

drop policy if exists "Hosts can read their own payments" on public.host_payments;
create policy "Hosts can read their own payments"
  on public.host_payments for select to authenticated
  using (user_id = (select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

drop policy if exists "Hosts can read their own subscriptions" on public.host_subscriptions;
create policy "Hosts can read their own subscriptions"
  on public.host_subscriptions for select to authenticated
  using (user_id = (select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

revoke all on public.host_payments from anon, authenticated;
revoke all on public.host_subscriptions from anon, authenticated;
grant select on public.host_payments to authenticated;
grant select on public.host_subscriptions to authenticated;
grant all on public.host_payments to service_role;
grant all on public.host_subscriptions to service_role;

comment on table public.host_payments is 'QSPICY host payment attempts. Client can read own rows; only trusted server functions can write.';
comment on table public.host_subscriptions is 'QSPICY prepaid host access. 750 XOF grants 15 days; no automatic renewal.';
