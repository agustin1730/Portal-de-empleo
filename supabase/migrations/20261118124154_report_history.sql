begin;
lock table public.reports in share row exclusive mode;
create table public.report_versions(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null,report_id uuid not null,
 title text not null,kind text not null,company_id text,content text not null,
 document_version timestamptz not null,started_at timestamptz not null default clock_timestamp(),changed_at timestamptz not null default clock_timestamp(),
 source text not null check(source in ('initial','portal','oauth','restore')),actor text not null,
 foreign key(owner_id,report_id) references public.reports(owner_id,id) on delete cascade
);
create index report_versions_owner_report on public.report_versions(owner_id,report_id,changed_at desc,id);
alter table public.report_versions enable row level security;
revoke all on public.report_versions from public,anon,authenticated;
grant select on public.report_versions to authenticated;
create policy owner_native_versions on public.report_versions for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'client_id') is null);
create table company_connector_private.report_restore_context(tx bigint primary key,owner_id uuid not null,report_id uuid not null);
revoke all on company_connector_private.report_restore_context from public,anon,authenticated;
insert into public.report_versions(owner_id,report_id,title,kind,company_id,content,document_version,source,actor)
 select owner_id,id,title,kind,company_id,content,updated_at,'initial','unknown' from public.reports;
create function company_connector_private.capture_report_version() returns trigger
language plpgsql security definer set search_path='' as $$
declare last public.report_versions;origin text;identity text;restoring boolean;
begin
 if auth.uid() is null or new.owner_id<>auth.uid() or not company_connector_private.has_permission('reports_write') then raise exception 'Report access disabled' using errcode='42501';end if;
 select exists(select 1 from company_connector_private.report_restore_context where tx=txid_current() and owner_id=auth.uid() and report_id=new.id) into restoring;
 if not restoring and tg_op='UPDATE' and row(new.title,new.kind,new.company_id,new.content) is not distinct from row(old.title,old.kind,old.company_id,old.content) then return new;end if;
 origin:=case when restoring then 'restore' when auth.jwt()->>'client_id' is not null then 'oauth' else 'portal' end;
 identity:=coalesce(auth.jwt()->>'client_id',auth.jwt()->>'session_id','tx:'||txid_current()::text);
 select * into last from public.report_versions where owner_id=new.owner_id and report_id=new.id order by changed_at desc,id desc limit 1 for update;
 if origin='portal' and last.source='portal' and last.actor=identity and clock_timestamp()-last.started_at<interval '60 seconds' then
  update public.report_versions set title=new.title,kind=new.kind,company_id=new.company_id,content=new.content,document_version=new.updated_at,changed_at=clock_timestamp() where id=last.id;
 else
  insert into public.report_versions(owner_id,report_id,title,kind,company_id,content,document_version,source,actor)
  values(new.owner_id,new.id,new.title,new.kind,new.company_id,new.content,new.updated_at,origin,identity);
 end if;
 delete from public.report_versions where owner_id=new.owner_id and report_id=new.id and id in
 (select id from public.report_versions where owner_id=new.owner_id and report_id=new.id order by changed_at desc,id desc offset 30);
 return new;
end;$$;
revoke all on function company_connector_private.capture_report_version() from public,anon,authenticated;
create trigger reports_history after insert or update on public.reports for each row execute function company_connector_private.capture_report_version();
create function company_connector_private.restore_report(p_id uuid,p_revision uuid,p_snapshot_version timestamptz,p_expected_version timestamptz,p_clear_company boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_report public.reports;snapshot public.report_versions;result jsonb;company text;
begin
 if auth.uid() is null or auth.jwt()->>'client_id' is not null or not company_connector_private.has_permission('reports_write') then raise exception 'Owner session required' using errcode='42501';end if;
 select * into current_report from public.reports where owner_id=auth.uid() and id=p_id for update;
 if not found then raise exception 'Report not found' using errcode='P0002';end if;
 if current_report.updated_at is distinct from p_expected_version then raise exception 'Report changed' using errcode='40001';end if;
 select * into snapshot from public.report_versions where owner_id=auth.uid() and report_id=p_id and id=p_revision for share;
 if not found then raise exception 'Version not found' using errcode='P0002';end if;
 if snapshot.document_version is distinct from p_snapshot_version then raise exception 'Version changed' using errcode='40001';end if;
 company:=case when p_clear_company then null else snapshot.company_id end;
 if company is not null and not exists(select 1 from public.candidate_profiles p cross join lateral jsonb_array_elements(coalesce(p.data->'crm_prospects','[]'::jsonb)) c where p.owner_id=auth.uid() and c->>'id'=company) then raise exception 'Company not found' using errcode='23503';end if;
 insert into company_connector_private.report_restore_context values(txid_current(),auth.uid(),p_id);
 update public.reports set title=snapshot.title,kind=snapshot.kind,company_id=company,content=snapshot.content where owner_id=auth.uid() and id=p_id returning to_jsonb(reports)-'owner_id' into result;
 delete from company_connector_private.report_restore_context where tx=txid_current();
 return result;
end;$$;
revoke all on function company_connector_private.restore_report(uuid,uuid,timestamptz,timestamptz,boolean) from public,anon;
grant execute on function company_connector_private.restore_report(uuid,uuid,timestamptz,timestamptz,boolean) to authenticated;
create function public.reports_restore(p_id uuid,p_revision uuid,p_snapshot_version timestamptz,p_expected_version timestamptz,p_clear_company boolean default false) returns jsonb
language sql security invoker set search_path='' as $$select company_connector_private.restore_report(p_id,p_revision,p_snapshot_version,p_expected_version,p_clear_company);$$;
revoke all on function public.reports_restore(uuid,uuid,timestamptz,timestamptz,boolean) from public,anon;
grant execute on function public.reports_restore(uuid,uuid,timestamptz,timestamptz,boolean) to authenticated;
create or replace function company_connector_private.guard_report() returns trigger
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
 if tg_op='UPDATE' and row(new.title,new.kind,new.company_id,new.content) is not distinct from row(old.title,old.kind,old.company_id,old.content) and not exists(select 1 from company_connector_private.report_restore_context where tx=txid_current() and owner_id=auth.uid() and report_id=new.id) then new.updated_at:=old.updated_at;else new.updated_at:=clock_timestamp();end if;
 return new;
end;$$;
commit;
