begin;
-- OAuth tokens never inherit access to the candidate's private profile, files or jobs.
create policy profile_no_oauth on public.candidate_profiles as restrictive for all to authenticated
 using ((select auth.jwt()->>'client_id') is null) with check ((select auth.jwt()->>'client_id') is null);
create policy files_no_oauth on public.candidate_files as restrictive for all to authenticated
 using ((select auth.jwt()->>'client_id') is null) with check ((select auth.jwt()->>'client_id') is null);
create policy jobs_no_oauth on public.jobs as restrictive for all to authenticated
 using ((select auth.jwt()->>'client_id') is null) with check ((select auth.jwt()->>'client_id') is null);

create schema if not exists company_connector_private;
revoke all on schema company_connector_private from public, anon;
grant usage on schema company_connector_private to authenticated;
create table company_connector_private.oauth_clients (
 client_id uuid primary key,
 resource text not null check(resource ~ '^https://[^[:space:]]+/mcp/companies$')
);
revoke all on company_connector_private.oauth_clients from public,anon,authenticated;
grant usage on schema company_connector_private to supabase_auth_admin;
grant select on company_connector_private.oauth_clients to supabase_auth_admin;
-- Preserve the native audience and add a signed binding to this MCP resource.
create function public.company_connector_access_token(event jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare claims jsonb;target text;
begin
 claims:=(event->'claims')-'resource';
 select resource into target from company_connector_private.oauth_clients where client_id::text=event->>'client_id';
 if target is not null then claims:=jsonb_set(claims,'{resource}',to_jsonb(target));end if;
 return jsonb_build_object('claims',claims);
end;$$;
revoke all on function public.company_connector_access_token(jsonb) from public,anon,authenticated;
grant execute on function public.company_connector_access_token(jsonb) to supabase_auth_admin;

create table public.company_research (
 owner_id uuid not null references auth.users(id) on delete cascade,
 company_id text not null check(company_id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 report jsonb not null check(jsonb_typeof(report)='object' and octet_length(report::text)<=50000),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,company_id)
);
alter table public.company_research enable row level security;
revoke all on public.company_research from public, anon, authenticated;
grant select on public.company_research to authenticated;
-- Narrow SECURITY DEFINER functions stay outside the exposed public schema.
-- They never take an owner argument, return profile data, or edit CRM records.
create function company_connector_private.active_session() returns setof boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return;end if;
 if auth.jwt()->>'client_id' is null or exists(select 1 from auth.sessions s join company_connector_private.oauth_clients c on c.client_id::text=auth.jwt()->>'client_id' where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid() and c.resource=auth.jwt()->>'resource') then return next true;end if;
end;$$;
revoke all on function company_connector_private.active_session() from public, anon;
grant execute on function company_connector_private.active_session() to authenticated;

create policy research_owner_read on public.company_research for select to authenticated
 using ((select auth.uid())=owner_id and ((select auth.jwt()->>'client_id') is null or exists (
 select 1 from company_connector_private.active_session()
 )));

create function company_connector_private.company_data(p_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from company_connector_private.active_session()) then raise exception 'Authentication required' using errcode='42501';end if;
 if p_id is not null and p_id !~ '^[a-zA-Z0-9_-]{1,80}$' then raise exception 'Invalid company';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',c->'id','name',c->'name','industry',c->'industry','country',c->'country',
 'website',c->'website','linkedin',c->'linkedin','instagram',c->'instagram',
 'source',c->'source','roles',c->'roles','stage',c->'stage','contacts',c->'contacts',
 'notes',c->'notes','nextAction',c->'nextAction','nextDate',c->'nextDate'
 )), '[]'::jsonb) into result
 from public.candidate_profiles p cross join lateral jsonb_array_elements(coalesce(p.data->'crm_prospects','[]'::jsonb)) c
 where p.owner_id=auth.uid() and (p_id is null or c->>'id'=p_id);
 return result;
end;$$;
revoke all on function company_connector_private.company_data(text) from public, anon;
grant execute on function company_connector_private.company_data(text) to authenticated;
create function public.crm_company_data(p_id text default null) returns jsonb
language sql security invoker set search_path='' as $$select company_connector_private.company_data(p_id);$$;
revoke all on function public.crm_company_data(text) from public, anon;
grant execute on function public.crm_company_data(text) to authenticated;

create function company_connector_private.read_research(p_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if jsonb_array_length(company_connector_private.company_data(p_id))<>1 or p_id is null then raise exception 'Company not found';end if;
 select jsonb_build_object('report',report,'updated_at',updated_at) into result from public.company_research where owner_id=auth.uid() and company_id=p_id;
 return result;
end;$$;
revoke all on function company_connector_private.read_research(text) from public, anon;
grant execute on function company_connector_private.read_research(text) to authenticated;
create function public.crm_read_research(p_id text) returns jsonb
language sql security invoker set search_path='' as $$select company_connector_private.read_research(p_id);$$;
revoke all on function public.crm_read_research(text) from public, anon;
grant execute on function public.crm_read_research(text) to authenticated;

create function company_connector_private.save_research(p_id text,p_report jsonb,p_expected_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_version timestamptz;result jsonb;item jsonb;key text;source_count integer;
begin
 if not exists(select 1 from company_connector_private.active_session()) then raise exception 'Authentication required' using errcode='42501';end if;
 -- Lock the profile to serialize company deletion and concurrent first reports.
 perform 1 from public.candidate_profiles where owner_id=auth.uid() for update;
 if p_id is null or jsonb_array_length(company_connector_private.company_data(p_id))<>1 then raise exception 'Company not found';end if;
 if p_report is null or jsonb_typeof(p_report)<>'object' or octet_length(p_report::text)>50000 then raise exception 'Invalid report';end if;
 if not(p_report ?& array['summary','facts','hypotheses','unknowns','nextSteps','sources']) or (select count(*) from jsonb_object_keys(p_report))<>6 then raise exception 'Invalid report fields';end if;
 if jsonb_typeof(p_report->'summary')<>'string' or length(btrim(p_report->>'summary'))<1 or length(p_report->>'summary')>2000 then raise exception 'Invalid summary';end if;
 foreach key in array array['facts','hypotheses','unknowns','nextSteps','sources'] loop
  if jsonb_typeof(p_report->key)<>'array' then raise exception 'Invalid list';end if;
 end loop;
 source_count:=jsonb_array_length(p_report->'sources');
 if source_count>20 or jsonb_array_length(p_report->'facts')>30 then raise exception 'Too many sources or facts';end if;
 for item in select value from jsonb_array_elements(p_report->'sources') loop
  if jsonb_typeof(item)<>'object' or not(item ?& array['title','url','consultedAt']) or jsonb_typeof(item->'title')<>'string' or length(btrim(item->>'title')) not between 1 and 200 or jsonb_typeof(item->'url')<>'string' or length(item->>'url')>2000 or item->>'url' !~ '^https?://[^/@[:space:]]+([/?#]|$)' or position('@' in split_part(split_part(item->>'url','://',2),'/',1))>0 or jsonb_typeof(item->'consultedAt')<>'string' or item->>'consultedAt' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid source';end if;
  if to_char((item->>'consultedAt')::date,'YYYY-MM-DD')<>item->>'consultedAt' or (item->>'consultedAt')::date > (now() at time zone 'UTC')::date then raise exception 'Invalid source date';end if;
 end loop;
 for item in select value from jsonb_array_elements(p_report->'facts') loop
  if jsonb_typeof(item)<>'object' or not(item ?& array['text','source']) or jsonb_typeof(item->'text')<>'string' or length(btrim(item->>'text')) not between 1 and 600 or jsonb_typeof(item->'source')<>'number' or item->>'source' !~ '^\d{1,2}$' then raise exception 'Invalid fact';end if;
  if (item->>'source')::integer>=source_count then raise exception 'Missing fact source';end if;
 end loop;
 foreach key in array array['hypotheses','unknowns','nextSteps'] loop
  if jsonb_array_length(p_report->key)>15 then raise exception 'Too many items';end if;
  for item in select value from jsonb_array_elements(p_report->key) loop
   if jsonb_typeof(item)<>'string' or length(btrim(item#>>'{}')) not between 1 and 600 then raise exception 'Invalid text';end if;
  end loop;
 end loop;
 select updated_at into old_version from public.company_research where owner_id=auth.uid() and company_id=p_id;
 if old_version is distinct from p_expected_version then raise exception 'Research changed' using errcode='40001';end if;
 insert into public.company_research(owner_id,company_id,report) values(auth.uid(),p_id,p_report)
 on conflict(owner_id,company_id) do update set report=excluded.report,updated_at=clock_timestamp()
 returning jsonb_build_object('report',report,'updated_at',updated_at) into result;
 return result;
end;$$;
revoke all on function company_connector_private.save_research(text,jsonb,timestamptz) from public, anon;
grant execute on function company_connector_private.save_research(text,jsonb,timestamptz) to authenticated;
create function public.crm_save_research(p_id text,p_report jsonb,p_expected_version timestamptz default null) returns jsonb
language sql security invoker set search_path='' as $$select company_connector_private.save_research(p_id,p_report,p_expected_version);$$;
revoke all on function public.crm_save_research(text,jsonb,timestamptz) from public, anon;
grant execute on function public.crm_save_research(text,jsonb,timestamptz) to authenticated;
commit;
