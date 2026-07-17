begin;

create or replace function public.next_finding_number(for_year int)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  n bigint;
  candidate text;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
     and coalesce(public.current_profile_role()::text, '') not in ('VERIFIER', 'SUPER_ADMIN') then
    raise exception 'Only verifiers and administrators can create findings';
  end if;
  if for_year < 2000 or for_year > 9999 then
    raise exception 'Invalid finding year';
  end if;

  insert into public.finding_number_counters(year, last_value)
  values(for_year, 0)
  on conflict(year) do nothing;

  select last_value into n
  from public.finding_number_counters
  where year = for_year
  for update;

  loop
    n := n + 1;
    candidate := format('SIS-%s-%s', for_year, lpad(n::text, 4, '0'));
    exit when not exists (
      select 1 from public.findings where finding_number = candidate
    );
  end loop;

  update public.finding_number_counters set last_value = n where year = for_year;
  return candidate;
end;
$$;

create policy findings_verifier_insert on public.findings
for insert
with check (
  public.current_profile_role() = 'VERIFIER'
  and created_by = auth.uid()
);

create index if not exists closure_submissions_verification_queue_idx
on public.closure_submissions(submitted_at, id)
where status = 'SUBMITTED';

create or replace function public.verification_inbox()
returns table (
  id uuid,
  submitted_at timestamptz,
  finding_id uuid,
  finding_number text,
  unit_number text,
  detailed_description text,
  company_name text,
  category_name text,
  submitter_name text,
  submission_number int
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if public.current_profile_role() not in ('VERIFIER', 'SUPER_ADMIN') then
    raise exception 'Forbidden';
  end if;
  return query
    select s.id, s.submitted_at, f.id, f.finding_number, f.unit_number,
           f.detailed_description, c.name, cat.short_name, p.full_name,
           s.submission_number
    from public.closure_submissions s
    join public.findings f on f.id = s.finding_id
    join public.companies c on c.id = f.company_id
    join public.categories cat on cat.id = f.category_id
    join public.profiles p on p.id = s.submitted_by
    where s.status = 'SUBMITTED'
    order by s.submitted_at, s.id;
end;
$$;

create or replace function public.admin_update_user_role(
  target_user_id uuid,
  new_role public.app_role,
  new_company_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  old_role public.app_role;
begin
  if not public.is_super_admin() then raise exception 'Forbidden'; end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  if new_role = 'CONTRACTOR' and new_company_id is null then
    raise exception 'Company is required for contractor accounts';
  end if;

  select role into old_role from public.profiles where id = target_user_id for update;
  if old_role is null then raise exception 'User not found'; end if;

  update public.profiles set role = new_role where id = target_user_id;
  delete from public.user_company_access where user_id = target_user_id;
  if new_role = 'CONTRACTOR' then
    insert into public.user_company_access(user_id, company_id)
    values(target_user_id, new_company_id);
  end if;
  insert into public.audit_logs(
    actor_user_id, entity_type, entity_id, action, old_values, new_values
  ) values (
    auth.uid(), 'profiles', target_user_id::text, 'ROLE_CHANGED',
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', new_role, 'company_id', new_company_id)
  );
end;
$$;

revoke all on function public.next_finding_number(int) from public;
grant execute on function public.next_finding_number(int) to authenticated, service_role;
revoke all on function public.verification_inbox() from public;
grant execute on function public.verification_inbox() to authenticated;
revoke all on function public.admin_update_user_role(uuid, public.app_role, uuid) from public;
grant execute on function public.admin_update_user_role(uuid, public.app_role, uuid) to authenticated;

commit;
