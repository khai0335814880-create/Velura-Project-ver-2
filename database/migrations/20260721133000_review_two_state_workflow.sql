-- Reviews are moderated synchronously and persist in exactly one visible/hidden state.
update public.review
set status = 'approved'::public.review_status,
    rejection_reason = null,
    moderated_at = coalesce(moderated_at, now()),
    updated_at = now(),
    version = version + 1
where status::text = 'pending';

alter table public.review alter column status set default 'approved'::public.review_status;
alter table public.review drop constraint if exists review_two_state_status;
alter table public.review add constraint review_two_state_status
  check (status::text in ('approved', 'rejected'));
