begin;

-- A restored database can retain policies while row-level security itself is
-- disabled. In that state publishable/anon clients can read hidden products.
alter table public.product enable row level security;

revoke insert, update, delete, truncate, references, trigger
on table public.product from anon, authenticated;
grant select on table public.product to anon, authenticated;

drop policy if exists product_catalog_select on public.product;
drop policy if exists product_public_select on public.product;
drop policy if exists product_admin_select on public.product;

create policy product_public_select
on public.product for select to anon
using (status = 'on_sale');

create policy product_admin_select
on public.product for select to authenticated
using (
  status = 'on_sale'
  or (select public.velura_has_admin_role(array[
    'super_admin',
    'admin_operator_sanpham',
    'admin_operator_gia_km',
    'admin_operator_danhgia_review'
  ]))
);

commit;
