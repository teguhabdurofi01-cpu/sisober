begin;
create function public.get_or_create_closure_draft(fid uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare f public.findings; existing uuid; next_number int; begin
 if public.current_profile_role()<>'CONTRACTOR' then raise exception 'Only contractors can create closure drafts'; end if;
 select * into f from public.findings where id=fid for update;
 if not found or not public.can_access_company(f.company_id) then raise exception 'Finding not found or forbidden'; end if;
 if f.current_status not in ('OPEN','REVISION_REQUIRED') then raise exception 'Finding is not eligible for closure submission'; end if;
 select id into existing from public.closure_submissions where finding_id=fid and submitted_by=auth.uid() and status='DRAFT' order by created_at desc limit 1;
 if existing is not null then return existing; end if;
 select coalesce(max(submission_number),0)+1 into next_number from public.closure_submissions where finding_id=fid;
 insert into public.closure_submissions(finding_id,submission_number,submitted_by) values(fid,next_number,auth.uid()) returning id into existing;
 return existing;
end $$;
revoke all on function public.get_or_create_closure_draft(uuid) from public;
grant execute on function public.get_or_create_closure_draft(uuid) to authenticated;
commit;
