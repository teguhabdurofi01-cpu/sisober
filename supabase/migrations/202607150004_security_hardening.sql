begin;
create or replace function public.next_finding_number(for_year int) returns text language plpgsql security definer set search_path='' as $$
declare n bigint; begin
 if not public.is_super_admin() then raise exception 'Only administrators can create finding numbers'; end if;
 if for_year < 2020 or for_year > extract(year from current_date)::int + 1 then raise exception 'Invalid finding year'; end if;
 insert into public.finding_number_counters(year,last_value) values(for_year,1)
 on conflict(year) do update set last_value=public.finding_number_counters.last_value+1
 returning last_value into n;
 return format('SIS-%s-%s',for_year,lpad(n::text,4,'0'));
end $$;
revoke all on function public.next_finding_number(int) from public;
grant execute on function public.next_finding_number(int) to authenticated;
commit;
