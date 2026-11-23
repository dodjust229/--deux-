-- Keep host account deletion possible: payment and subscription history is owned by that account.
alter table public.host_subscriptions
  drop constraint if exists host_subscriptions_payment_id_fkey;
alter table public.host_subscriptions
  add constraint host_subscriptions_payment_id_fkey
  foreign key (payment_id) references public.host_payments(id) on delete cascade;
