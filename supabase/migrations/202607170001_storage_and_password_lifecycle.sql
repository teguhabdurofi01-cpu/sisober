begin;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_changed_at timestamptz;

alter table public.profiles alter column must_change_password set default true;

alter table public.closure_evidence
  add column if not exists storage_provider text not null default 'google',
  add column if not exists storage_object_key text;

create unique index if not exists closure_evidence_storage_object_idx
  on public.closure_evidence(storage_provider, storage_object_key)
  where storage_object_key is not null;

create or replace function public.mark_own_password_changed()
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.profiles
  set must_change_password=false,password_changed_at=now()
  where id=auth.uid() and active;
  if not found then raise exception 'Active profile not found'; end if;
end $$;

revoke all on function public.mark_own_password_changed() from public;
grant execute on function public.mark_own_password_changed() to authenticated;

commit;
