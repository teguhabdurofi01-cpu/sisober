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

  -- Persist the reservation before returning so concurrent callers advance.
  update public.finding_number_counters set last_value = n where year = for_year;
  return candidate;
end;
$$;

create or replace function public.admin_delete_finding(fid uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  removed_number text;
  removed_year int;
  removed_sequence bigint;
begin
  if not public.is_super_admin() then raise exception 'Forbidden'; end if;

  select finding_number into removed_number
  from public.findings
  where id = fid
  for update;
  if removed_number is null then raise exception 'Finding not found'; end if;

  delete from public.notifications where finding_id = fid;
  delete from public.verification_actions where finding_id = fid;
  delete from public.closure_submissions where finding_id = fid;
  delete from public.findings where id = fid;

  if removed_number ~ '^SIS-[0-9]{4}-[0-9]+$' then
    removed_year := split_part(removed_number, '-', 2)::int;
    removed_sequence := split_part(removed_number, '-', 3)::bigint;
    insert into public.finding_number_counters(year, last_value)
    values(removed_year, greatest(removed_sequence - 1, 0))
    on conflict(year) do update
      set last_value = least(
        public.finding_number_counters.last_value,
        greatest(excluded.last_value, 0)
      );
  end if;
end;
$$;

revoke all on function public.next_finding_number(int) from public;
grant execute on function public.next_finding_number(int) to authenticated, service_role;
revoke all on function public.admin_delete_finding(uuid) from public;
grant execute on function public.admin_delete_finding(uuid) to authenticated;

commit;
