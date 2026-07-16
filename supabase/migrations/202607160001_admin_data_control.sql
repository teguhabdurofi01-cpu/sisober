begin;

create or replace function public.admin_delete_finding(fid uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.is_super_admin() then raise exception 'Forbidden'; end if;
  if not exists(select 1 from public.findings where id=fid) then raise exception 'Finding not found'; end if;
  delete from public.notifications where finding_id=fid;
  delete from public.verification_actions where finding_id=fid;
  delete from public.closure_submissions where finding_id=fid;
  delete from public.findings where id=fid;
end;
$$;

revoke all on function public.admin_delete_finding(uuid) from public;
grant execute on function public.admin_delete_finding(uuid) to authenticated;

commit;
