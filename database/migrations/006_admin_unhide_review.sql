-- Reviews are approved automatically at submission time. Admins only hide or
-- restore visibility; manual approval is intentionally not part of this flow.
create or replace function public.admin_unhide_review(
  p_review_id uuid,
  p_expected_version integer,
  p_ip_address text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_actor public.users%rowtype;
  v_before public.review%rowtype;
  v_after public.review%rowtype;
begin
  select * into v_actor from public.users where user_id = public.velura_current_user_id();
  if v_actor.user_id is null
     or v_actor.is_active is not true
     or coalesce(v_actor.admin_role::text, '') not in ('super_admin', 'admin_operator_danhgia_review') then
    raise sqlstate 'PT403' using message = 'REVIEW_ADMIN_REQUIRED';
  end if;

  select * into v_before from public.review where review_id = p_review_id for update;
  if v_before.review_id is null then raise sqlstate 'PT404' using message = 'REVIEW_NOT_FOUND'; end if;
  if v_before.version <> p_expected_version then raise sqlstate 'PT409' using message = 'VERSION_CONFLICT'; end if;
  if v_before.status::text <> 'rejected' then
    raise sqlstate 'PT422' using message = 'REVIEW_IS_NOT_HIDDEN';
  end if;

  update public.review
  set status = 'approved'::public.review_status,
      rejection_reason = null,
      moderated_by = v_actor.user_id,
      moderated_at = now(),
      is_flagged_urgent = false,
      version = version + 1,
      updated_at = now()
  where review_id = p_review_id and version = p_expected_version
  returning * into v_after;
  if v_after.review_id is null then raise sqlstate 'PT409' using message = 'VERSION_CONFLICT'; end if;

  perform public.velura_append_module_audit(
    'reviews', v_actor.user_id, v_actor.admin_role::text, 'update', p_review_id,
    jsonb_build_object('status', v_before.status, 'version', v_before.version),
    jsonb_build_object('status', v_after.status, 'version', v_after.version),
    p_ip_address
  );

  return to_jsonb(v_after);
end;
$$;

revoke all on function public.admin_unhide_review(uuid, integer, text) from public, anon;
grant execute on function public.admin_unhide_review(uuid, integer, text) to authenticated;
