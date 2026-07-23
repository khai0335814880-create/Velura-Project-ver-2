begin;

alter table public.review enable row level security;

grant select on table public.review to anon;

drop policy if exists review_public_approved_select on public.review;
create policy review_public_approved_select
on public.review for select to anon
using (status::text = 'approved');

commit;
