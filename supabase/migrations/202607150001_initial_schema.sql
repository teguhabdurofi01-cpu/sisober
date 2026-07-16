begin;
create extension if not exists pgcrypto;

create type public.app_role as enum ('VIEWER','CONTRACTOR','VERIFIER','SUPER_ADMIN');
create type public.category_group as enum ('SAFETY_DEVICE','ELECTRICAL_CASE','TYRE_MANAGEMENT','LEGAL_PROCEDURE','OTHER');
create type public.evidence_requirement as enum ('NONE','OPTIONAL','REQUIRED');
create type public.finding_status as enum ('OPEN','PENDING_VERIFICATION','REVISION_REQUIRED','CLOSED');
create type public.source_type as enum ('WEB','LEGACY_EXCEL');
create type public.submission_status as enum ('DRAFT','SUBMITTED','APPROVED','REJECTED','SUPERSEDED');
create type public.evidence_type as enum ('BEFORE','AFTER','DOCUMENT','OTHER');
create type public.upload_status as enum ('PENDING','UPLOADING','UPLOADED','FAILED');
create type public.verification_action as enum ('APPROVED','REJECTED','REOPENED');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, full_name text not null, email text not null,
 nik text, role public.app_role not null default 'VIEWER', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.companies (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, active boolean not null default true);
create table public.user_company_access (user_id uuid references public.profiles(id) on delete cascade, company_id uuid references public.companies(id) on delete cascade, primary key(user_id,company_id));
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null unique, short_name text not null, category_group public.category_group not null default 'OTHER', default_evidence_requirement public.evidence_requirement not null default 'OPTIONAL', active boolean not null default true);
create table public.sections (id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true);
create table public.finding_number_counters (year int primary key, last_value bigint not null default 0);
create table public.findings (
 id uuid primary key default gen_random_uuid(), finding_number text not null unique, finding_date date not null,
 category_id uuid not null references public.categories(id), detailed_description text not null,
 company_id uuid not null references public.companies(id), section_id uuid not null references public.sections(id),
 unit_number text, location text, assigned_to uuid references public.profiles(id), target_date date,
 current_status public.finding_status not null default 'OPEN', evidence_requirement public.evidence_requirement not null,
 created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 closed_at timestamptz, closed_by uuid references public.profiles(id), source_type public.source_type not null default 'WEB',
 legacy_source_workbook text, legacy_source_row int, legacy_original_number text, legacy_original_values jsonb,
 constraint legacy_identity unique nulls not distinct (legacy_source_workbook,legacy_source_row),
 constraint closed_fields check (current_status<>'CLOSED' or closed_at is not null)
);
create table public.closure_submissions (
 id uuid primary key default gen_random_uuid(), finding_id uuid not null references public.findings(id), submission_number int not null,
 submitted_by uuid not null references public.profiles(id), corrective_action text not null default '', completion_date date,
 submitter_note text, status public.submission_status not null default 'DRAFT', submitted_at timestamptz,
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, verifier_note text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(finding_id,submission_number)
);
create table public.closure_evidence (
 id uuid primary key default gen_random_uuid(), closure_submission_id uuid not null references public.closure_submissions(id) on delete cascade,
 evidence_type public.evidence_type not null, original_filename text not null, stored_filename text not null, mime_type text not null,
 file_size bigint not null check(file_size > 0), google_drive_file_id text unique, google_drive_parent_id text,
 google_drive_web_view_link text, upload_status public.upload_status not null default 'PENDING', upload_error text,
 upload_key uuid not null default gen_random_uuid() unique, uploaded_by uuid not null references public.profiles(id), uploaded_at timestamptz, created_at timestamptz not null default now()
);
create table public.verification_actions (id uuid primary key default gen_random_uuid(), finding_id uuid not null references public.findings(id), closure_submission_id uuid references public.closure_submissions(id), action public.verification_action not null, note text, performed_by uuid not null references public.profiles(id), performed_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), recipient_user_id uuid not null references public.profiles(id) on delete cascade, type text not null, title text not null, message text not null, finding_id uuid references public.findings(id), closure_submission_id uuid references public.closure_submissions(id), read_at timestamptz, email_status text, email_error text, created_at timestamptz not null default now());
create table public.audit_logs (id bigint generated always as identity primary key, actor_user_id uuid references public.profiles(id), entity_type text not null, entity_id text not null, action text not null, old_values jsonb, new_values jsonb, metadata jsonb, created_at timestamptz not null default now());

create index findings_company_status_idx on public.findings(company_id,current_status);
create index findings_date_idx on public.findings(finding_date desc);
create index findings_category_idx on public.findings(category_id);
create index closure_submissions_finding_idx on public.closure_submissions(finding_id,submission_number desc);
create index notifications_recipient_idx on public.notifications(recipient_user_id,read_at,created_at desc);
create index audit_entity_idx on public.audit_logs(entity_type,entity_id,created_at desc);

create function public.current_profile_role() returns public.app_role language sql stable security definer set search_path='' as $$ select role from public.profiles where id=auth.uid() and active $$;
create function public.is_super_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(public.current_profile_role()='SUPER_ADMIN',false) $$;
create function public.can_access_company(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and (p.role in ('VERIFIER','SUPER_ADMIN','VIEWER') or exists(select 1 from public.user_company_access a where a.user_id=p.id and a.company_id=cid)))
$$;
create function public.next_finding_number(for_year int) returns text language plpgsql security definer set search_path='' as $$
declare n bigint; begin insert into public.finding_number_counters(year,last_value) values(for_year,1) on conflict(year) do update set last_value=public.finding_number_counters.last_value+1 returning last_value into n; return format('SIS-%s-%s',for_year,lpad(n::text,4,'0')); end $$;

create function public.set_timestamps_and_audit() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='UPDATE' then new.updated_at=now(); end if;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,old_values,new_values) values(auth.uid(),tg_table_name,coalesce(new.id,old.id)::text,tg_op,case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end); return coalesce(new,old); end $$;
create trigger findings_audit before insert or update on public.findings for each row execute function public.set_timestamps_and_audit();
create trigger submissions_audit before insert or update on public.closure_submissions for each row execute function public.set_timestamps_and_audit();
create function public.audit_simple_mutation() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,old_values,new_values) values(auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'user_id',to_jsonb(old)->>'user_id'),tg_op,case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end); return coalesce(new,old); end $$;
create trigger profiles_audit after insert or update or delete on public.profiles for each row execute function public.audit_simple_mutation();
create trigger access_audit after insert or update or delete on public.user_company_access for each row execute function public.audit_simple_mutation();
create trigger evidence_audit after insert or update on public.closure_evidence for each row execute function public.audit_simple_mutation();

create function public.submit_closure(sid uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.closure_submissions; f public.findings; uploaded int; pending int; begin
 select * into s from public.closure_submissions where id=sid for update; if not found then raise exception 'Submission not found'; end if;
 select * into f from public.findings where id=s.finding_id for update;
 if auth.uid()<>s.submitted_by or not public.can_access_company(f.company_id) then raise exception 'Forbidden'; end if;
 if s.status<>'DRAFT' or f.current_status not in ('OPEN','REVISION_REQUIRED') then raise exception 'Invalid state transition'; end if;
 if nullif(trim(s.corrective_action),'') is null or s.completion_date is null then raise exception 'Corrective action and completion date are required'; end if;
 select count(*) filter(where upload_status='UPLOADED'),count(*) filter(where upload_status<>'UPLOADED') into uploaded,pending from public.closure_evidence where closure_submission_id=sid;
 if f.evidence_requirement='REQUIRED' and (uploaded=0 or pending>0) then raise exception 'Required evidence must finish uploading'; end if;
 update public.closure_submissions set status='SUBMITTED',submitted_at=now() where id=sid;
 update public.findings set current_status='PENDING_VERIFICATION' where id=f.id;
 insert into public.notifications(recipient_user_id,type,title,message,finding_id,closure_submission_id)
 select p.id,'CLOSURE_SUBMITTED','Closure awaiting verification',format('%s is ready for verification',f.finding_number),f.id,sid from public.profiles p where p.active and p.role in ('VERIFIER','SUPER_ADMIN') and p.id<>s.submitted_by;
end $$;
create function public.review_closure(sid uuid, decision public.verification_action, note text default null) returns void language plpgsql security definer set search_path='' as $$
declare s public.closure_submissions; f public.findings; begin
 if public.current_profile_role() not in ('VERIFIER','SUPER_ADMIN') then raise exception 'Forbidden'; end if;
 select * into s from public.closure_submissions where id=sid for update; select * into f from public.findings where id=s.finding_id for update;
 if s.status<>'SUBMITTED' or f.current_status<>'PENDING_VERIFICATION' then raise exception 'Submission already processed or stale'; end if;
 if s.submitted_by=auth.uid() then raise exception 'Self approval is forbidden'; end if;
 if exists(select 1 from public.closure_submissions x where x.finding_id=s.finding_id and x.submission_number>s.submission_number) then raise exception 'A newer submission exists'; end if;
 if decision='APPROVED' then update public.closure_submissions set status='APPROVED',reviewed_by=auth.uid(),reviewed_at=now(),verifier_note=note where id=sid; update public.findings set current_status='CLOSED',closed_at=now(),closed_by=auth.uid() where id=f.id;
 elsif decision='REJECTED' then if nullif(trim(note),'') is null then raise exception 'Rejection reason is required'; end if; update public.closure_submissions set status='REJECTED',reviewed_by=auth.uid(),reviewed_at=now(),verifier_note=note where id=sid; update public.findings set current_status='REVISION_REQUIRED' where id=f.id;
 else raise exception 'Unsupported review action'; end if;
 insert into public.verification_actions(finding_id,closure_submission_id,action,note,performed_by) values(f.id,sid,decision,note,auth.uid());
 insert into public.notifications(recipient_user_id,type,title,message,finding_id,closure_submission_id) values(s.submitted_by,'CLOSURE_'||decision::text,case when decision='APPROVED' then 'Closure approved' else 'Revision required' end,coalesce(note,format('%s has been approved',f.finding_number)),f.id,sid);
end $$;
create function public.reopen_finding(fid uuid, reason text) returns void language plpgsql security definer set search_path='' as $$ declare f public.findings; s uuid; begin
 if not public.is_super_admin() or nullif(trim(reason),'') is null then raise exception 'Forbidden or missing reason'; end if; select * into f from public.findings where id=fid for update; if f.current_status<>'CLOSED' then raise exception 'Only closed findings can reopen'; end if; select submitted_by into s from public.closure_submissions where finding_id=fid order by submission_number desc limit 1; update public.findings set current_status='REVISION_REQUIRED',closed_at=null,closed_by=null where id=fid; insert into public.verification_actions(finding_id,action,note,performed_by) values(fid,'REOPENED',reason,auth.uid()); if s is not null then insert into public.notifications(recipient_user_id,type,title,message,finding_id) values(s,'FINDING_REOPENED','Finding reopened',reason,fid); end if; end $$;

alter table public.finding_number_counters enable row level security; alter table public.profiles enable row level security; alter table public.companies enable row level security; alter table public.user_company_access enable row level security; alter table public.categories enable row level security; alter table public.sections enable row level security; alter table public.findings enable row level security; alter table public.closure_submissions enable row level security; alter table public.closure_evidence enable row level security; alter table public.verification_actions enable row level security; alter table public.notifications enable row level security; alter table public.audit_logs enable row level security;
create policy profiles_self_select on public.profiles for select using(id=auth.uid() or public.is_super_admin()); create policy profiles_admin_all on public.profiles for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy master_read on public.companies for select using(public.current_profile_role() is not null); create policy master_admin on public.companies for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy category_read on public.categories for select using(public.current_profile_role() is not null); create policy category_admin on public.categories for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy section_read on public.sections for select using(public.current_profile_role() is not null); create policy section_admin on public.sections for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy access_self_read on public.user_company_access for select using(user_id=auth.uid() or public.is_super_admin()); create policy access_admin on public.user_company_access for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy findings_authorized_read on public.findings for select using(public.can_access_company(company_id)); create policy findings_admin_write on public.findings for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy submissions_read on public.closure_submissions for select using(exists(select 1 from public.findings f where f.id=finding_id and public.can_access_company(f.company_id)));
create policy submissions_draft_insert on public.closure_submissions for insert with check(submitted_by=auth.uid() and status='DRAFT' and public.current_profile_role()='CONTRACTOR' and exists(select 1 from public.findings f where f.id=finding_id and public.can_access_company(f.company_id)));
create policy submissions_draft_update on public.closure_submissions for update using(submitted_by=auth.uid() and status='DRAFT') with check(submitted_by=auth.uid() and status='DRAFT');
create policy evidence_read on public.closure_evidence for select using(exists(select 1 from public.closure_submissions s join public.findings f on f.id=s.finding_id where s.id=closure_submission_id and public.can_access_company(f.company_id)));
create policy evidence_draft_write on public.closure_evidence for all using(uploaded_by=auth.uid() and exists(select 1 from public.closure_submissions s where s.id=closure_submission_id and s.status='DRAFT' and s.submitted_by=auth.uid())) with check(uploaded_by=auth.uid());
create policy verification_read on public.verification_actions for select using(exists(select 1 from public.findings f where f.id=finding_id and public.can_access_company(f.company_id)));
create policy notification_own_read on public.notifications for select using(recipient_user_id=auth.uid()); create policy notification_own_update on public.notifications for update using(recipient_user_id=auth.uid()) with check(recipient_user_id=auth.uid());
create policy audit_authorized_read on public.audit_logs for select using(public.current_profile_role() in ('VERIFIER','SUPER_ADMIN') or (entity_type='findings' and exists(select 1 from public.findings f where f.id::text=entity_id and public.can_access_company(f.company_id))));
revoke all on function public.submit_closure(uuid) from public; grant execute on function public.submit_closure(uuid) to authenticated;
revoke all on function public.review_closure(uuid,public.verification_action,text) from public; grant execute on function public.review_closure(uuid,public.verification_action,text) to authenticated;
revoke all on function public.reopen_finding(uuid,text) from public; grant execute on function public.reopen_finding(uuid,text) to authenticated;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
commit;
