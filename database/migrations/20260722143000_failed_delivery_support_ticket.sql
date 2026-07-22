begin;
alter table public.support_ticket add column if not exists source_order_id uuid references public.orders(order_id) on delete set null;
create index if not exists idx_support_ticket_source_order on public.support_ticket(source_order_id, created_at desc) where source_order_id is not null;
create unique index if not exists uq_support_ticket_active_source_order on public.support_ticket(user_id, source_order_id) where source_order_id is not null and status in ('open'::public.ticket_status, 'processing'::public.ticket_status);
comment on column public.support_ticket.source_order_id is 'Order that originated this support request, including failed-delivery requests.';
commit;
