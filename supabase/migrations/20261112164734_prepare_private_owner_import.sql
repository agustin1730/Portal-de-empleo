create schema if not exists job_import_private;
revoke all on schema job_import_private from public, anon, authenticated;
create table job_import_private.pending_import (
 owner_email text primary key check (owner_email = lower(owner_email)),
 records jsonb not null check (jsonb_typeof(records)='array'),
 imported_at timestamptz,
 imported_user_id uuid references auth.users(id) on delete set null
);
alter table job_import_private.pending_import enable row level security;
revoke all on job_import_private.pending_import from public, anon, authenticated;
create function job_import_private.claim_verified_owner_import() returns trigger
language plpgsql security definer set search_path='' as $$
declare pending record; item jsonb;
begin
 if new.email is null or new.email_confirmed_at is null then return new; end if;
 for pending in
  select * from job_import_private.pending_import
  where owner_email=lower(new.email) and imported_at is null
  for update
 loop
  for item in select value from jsonb_array_elements(pending.records)
  loop
   insert into public.jobs(owner_id,id,payload,status,notes,applied_at,created_at,updated_at)
   values(new.id,item->>'id',item->'payload',coalesce(item->>'status','pendiente'),
    coalesce(item->>'notes',''),nullif(item->>'applied_at','')::date,
    coalesce(nullif(item->>'created_at','')::timestamptz,now()),now())
   on conflict(owner_id,id) do nothing;
  end loop;
  update job_import_private.pending_import set records='[]'::jsonb,
   imported_at=now(),imported_user_id=new.id
   where owner_email=pending.owner_email;
 end loop;
 return new;
end;
$$;
revoke all on function job_import_private.claim_verified_owner_import() from public, anon, authenticated;
create trigger claim_job_import_after_owner_verification
 after insert or update of email_confirmed_at on auth.users
 for each row execute function job_import_private.claim_verified_owner_import();
