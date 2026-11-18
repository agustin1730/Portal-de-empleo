begin;
-- New report permissions never inherit access from legacy company investigations.
create or replace function company_connector_private.valid_permissions(p jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(p)='object' then
 p ?& array['companies','contacts','applications','profile','notes','research_read','research_write']
 and not exists(select 1 from jsonb_each(p) e where e.key<>all(array['companies','contacts','applications','profile','notes','research_read','research_write','reports_read','reports_write']) or jsonb_typeof(e.value)<>'boolean')
 and (p->'research_write'<>'true'::jsonb or p->'research_read'='true'::jsonb)
 and (coalesce(p->'reports_write','false'::jsonb)<>'true'::jsonb or coalesce(p->'reports_read','false'::jsonb)='true'::jsonb)
 else false end;
$$;
create or replace function company_connector_private.effective_permissions() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_object_agg(k,company_connector_private.has_permission(k))
 from unnest(array['companies','contacts','applications','profile','notes','research_read','research_write','reports_read','reports_write']) k;
$$;

create table public.reports(
 id uuid not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 200),
 kind text not null check(kind in ('investigacion','carta')),
 company_id text check(company_id is null or company_id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 content text not null default '' check(length(content)<=40000 and octet_length(content)<=50000),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,id)
);
create index reports_owner_updated on public.reports(owner_id,updated_at desc,id);
alter table public.reports enable row level security;
revoke all on public.reports from public,anon,authenticated;
grant select,insert,update on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated
 using (owner_id=(select auth.uid()) and (select company_connector_private.has_permission('reports_read')));
create policy reports_insert on public.reports for insert to authenticated
 with check(owner_id=(select auth.uid()) and (select company_connector_private.has_permission('reports_read')) and (select company_connector_private.has_permission('reports_write')));
create policy reports_update on public.reports for update to authenticated
 using(owner_id=(select auth.uid()) and (select company_connector_private.has_permission('reports_read')) and (select company_connector_private.has_permission('reports_write')))
 with check(owner_id=(select auth.uid()) and (select company_connector_private.has_permission('reports_read')) and (select company_connector_private.has_permission('reports_write')));

-- Validate relationships even for direct Data API writes. Never expose company data here.
create function company_connector_private.guard_report() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id<>auth.uid() or not company_connector_private.has_permission('reports_read') or not company_connector_private.has_permission('reports_write') then raise exception 'Report access disabled' using errcode='42501';end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.owner_id<>old.owner_id then raise exception 'Immutable report identity';end if;
  new.created_at:=old.created_at;
 end if;
 if new.company_id is not null and (tg_op='INSERT' or new.company_id is distinct from old.company_id) then
  if auth.jwt()->>'client_id' is not null and not company_connector_private.has_permission('companies') then raise exception 'Company access disabled' using errcode='42501';end if;
  perform 1 from public.candidate_profiles where owner_id=auth.uid() for share;
  if not exists(select 1 from public.candidate_profiles p cross join lateral jsonb_array_elements(coalesce(p.data->'crm_prospects','[]'::jsonb)) c where p.owner_id=auth.uid() and c->>'id'=new.company_id) then raise exception 'Company not found' using errcode='23503';end if;
 end if;
 new.updated_at:=clock_timestamp();
 return new;
end;$$;
revoke all on function company_connector_private.guard_report() from public,anon,authenticated;
create trigger reports_guard before insert or update on public.reports for each row execute function company_connector_private.guard_report();

create function public.reports_save(p_id uuid,p_title text,p_kind text,p_company_id text,p_content text,p_expected_version timestamptz) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare previous timestamptz;result jsonb;
begin
 if not company_connector_private.has_permission('reports_read') or not company_connector_private.has_permission('reports_write') then raise exception 'Report access disabled' using errcode='42501';end if;
 select updated_at into previous from public.reports where owner_id=auth.uid() and id=p_id for update;
 if previous is distinct from p_expected_version then raise exception 'Report changed' using errcode='40001';end if;
 if previous is null then
  begin
   insert into public.reports(id,owner_id,title,kind,company_id,content) values(p_id,auth.uid(),p_title,p_kind,p_company_id,p_content)
   returning to_jsonb(reports)-'owner_id' into result;
  exception when unique_violation then raise exception 'Report changed' using errcode='40001';end;
 else
  update public.reports set title=p_title,kind=p_kind,company_id=p_company_id,content=p_content where owner_id=auth.uid() and id=p_id
  returning to_jsonb(reports)-'owner_id' into result;
 end if;
 return result;
end;$$;
revoke all on function public.reports_save(uuid,text,text,text,text,timestamptz) from public,anon;
grant execute on function public.reports_save(uuid,text,text,text,text,timestamptz) to authenticated;
commit;
