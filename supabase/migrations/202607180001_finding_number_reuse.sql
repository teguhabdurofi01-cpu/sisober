begin;

create or replace function public.next_finding_number(for_year int)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  n bigint := 1;
  candidate text;
begin
  if for_year < 2000 or for_year > 9999 then
    raise exception 'Invalid finding year';
  end if;

  -- Serialize allocation per year, then fill the earliest available business number.
  -- UUID primary keys remain immutable and are never reused.
  perform pg_advisory_xact_lock(20260718, for_year);
  loop
    candidate := format('SIS-%s-%s', for_year, lpad(n::text, 4, '0'));
    exit when not exists (
      select 1 from public.findings where finding_number = candidate
    );
    n := n + 1;
  end loop;

  insert into public.finding_number_counters(year, last_value)
  values(for_year, n)
  on conflict(year) do update set last_value = excluded.last_value;

  return candidate;
end;
$$;

revoke all on function public.next_finding_number(int) from public;
grant execute on function public.next_finding_number(int) to authenticated, service_role;

commit;
