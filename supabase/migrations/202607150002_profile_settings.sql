begin;
create function public.update_own_profile(new_full_name text, new_nik text default null) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(new_full_name))<2 or length(trim(new_full_name))>120 then raise exception 'Full name must be 2-120 characters'; end if;
 update public.profiles set full_name=trim(new_full_name),nik=nullif(trim(new_nik),'') where id=auth.uid() and active;
 if not found then raise exception 'Active profile not found'; end if;
end $$;
revoke all on function public.update_own_profile(text,text) from public;
grant execute on function public.update_own_profile(text,text) to authenticated;
commit;
