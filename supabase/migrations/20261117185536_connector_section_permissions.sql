begin;
create function company_connector_private.valid_permissions(p jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(p)='object' then
 p ?& array['companies','contacts','applications','profile','notes','research_read','research_write']
 and (select count(*) from jsonb_each(p))=7
 and not exists(select 1 from jsonb_each(p) e where jsonb_typeof(e.value)<>'boolean')
 and (p->'research_write'<>'true'::jsonb or p->'research_read'='true'::jsonb)
 else false end;
$$;
revoke all on function company_connector_private.valid_permissions(jsonb) from public,anon;
grant execute on function company_connector_private.valid_permissions(jsonb) to authenticated;
create table public.connector_permissions(
 owner_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null references company_connector_private.oauth_clients(client_id) on delete cascade,
 permissions jsonb not null check(company_connector_private.valid_permissions(permissions)),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,client_id)
);
alter table public.connector_permissions enable row level security;
revoke all on public.connector_permissions from public,anon;
grant select,insert,update,delete on public.connector_permissions to authenticated;
create policy manage_own_connector_permissions on public.connector_permissions for all to authenticated
 using ((select auth.uid())=owner_id and (select auth.jwt()->>'client_id') is null)
 with check ((select auth.uid())=owner_id and (select auth.jwt()->>'client_id') is null);

create function public.connector_save_permissions(p_client_id uuid,p_permissions jsonb,p_expected_version timestamptz default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare previous timestamptz;result jsonb;
begin
 if auth.uid() is null or auth.jwt()->>'client_id' is not null then raise exception 'Only the owner session can manage permissions' using errcode='42501';end if;
 if not coalesce(company_connector_private.valid_permissions(p_permissions),false) then raise exception 'Invalid permissions';end if;
 select updated_at into previous from public.connector_permissions where owner_id=auth.uid() and client_id=p_client_id for update;
 if previous is distinct from p_expected_version then raise exception 'Permissions changed' using errcode='40001';end if;
 if previous is null then
  begin insert into public.connector_permissions(owner_id,client_id,permissions) values(auth.uid(),p_client_id,p_permissions)
   returning jsonb_build_object('permissions',permissions,'updated_at',updated_at) into result;
  exception when unique_violation then raise exception 'Permissions changed' using errcode='40001';end;
 else
  update public.connector_permissions set permissions=p_permissions,updated_at=clock_timestamp()
   where owner_id=auth.uid() and client_id=p_client_id returning jsonb_build_object('permissions',permissions,'updated_at',updated_at) into result;
 end if;
 return result;
end;$$;
revoke all on function public.connector_save_permissions(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.connector_save_permissions(uuid,jsonb,timestamptz) to authenticated;

create function company_connector_private.has_permission(p_key text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare allowed boolean;
begin
 if not exists(select 1 from company_connector_private.active_session()) then return false;end if;
 if auth.jwt()->>'client_id' is null then return true;end if;
 select (permissions->>p_key)::boolean into allowed from public.connector_permissions
  where owner_id=auth.uid() and client_id::text=auth.jwt()->>'client_id';
 return coalesce(allowed,false);
end;$$;
revoke all on function company_connector_private.has_permission(text) from public,anon;
grant execute on function company_connector_private.has_permission(text) to authenticated;
create function company_connector_private.effective_permissions() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_object_agg(k,company_connector_private.has_permission(k))
 from unnest(array['companies','contacts','applications','profile','notes','research_read','research_write']) k;
$$;
revoke all on function company_connector_private.effective_permissions() from public,anon;
grant execute on function company_connector_private.effective_permissions() to authenticated;
create function public.connector_effective_permissions() returns jsonb language sql stable security invoker set search_path='' as $$select company_connector_private.effective_permissions();$$;
revoke all on function public.connector_effective_permissions() from public,anon;
grant execute on function public.connector_effective_permissions() to authenticated;

-- Remove direct access to the old unfiltered company projection.
alter function company_connector_private.company_data(text) rename to company_data_unfiltered_v1;
revoke all on function company_connector_private.company_data_unfiltered_v1(text) from public,anon,authenticated;
create function company_connector_private.company_data(p_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rows jsonb;
begin
 if not company_connector_private.has_permission('companies') then raise exception 'Company access disabled' using errcode='42501';end if;
 rows:=company_connector_private.company_data_unfiltered_v1(p_id);
 if auth.jwt()->>'client_id' is null then return rows;end if;
 select coalesce(jsonb_agg(c
  - case when company_connector_private.has_permission('contacts') then array[]::text[] else array['contacts'] end
  - case when company_connector_private.has_permission('notes') then array[]::text[] else array['notes','nextAction','nextDate'] end),'[]'::jsonb)
 into rows from jsonb_array_elements(rows) c;
 return rows;
end;$$;
revoke all on function company_connector_private.company_data(text) from public,anon;
grant execute on function company_connector_private.company_data(text) to authenticated;
create or replace function public.crm_company_data(p_id text default null) returns jsonb
language sql security invoker set search_path='' as $$select company_connector_private.company_data(p_id);$$;

create policy research_permission_restriction on public.company_research as restrictive for select to authenticated
 using ((select auth.jwt()->>'client_id') is null or (select company_connector_private.has_permission('research_read')));

-- These projections return only the requested section. Profile/files/jobs RLS stays closed to OAuth.
create function company_connector_private.contacts() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not company_connector_private.has_permission('contacts') then raise exception 'Contact access disabled' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('company_id',c->'id','contact',jsonb_build_object(
  'name',v->'name','role',v->'role','email',v->'email','phone',v->'phone','linkedin',v->'linkedin'))
  ||case when company_connector_private.has_permission('companies') then jsonb_build_object('company_name',c->'name') else '{}'::jsonb end),'[]'::jsonb)
 into result from jsonb_array_elements(company_connector_private.company_data_unfiltered_v1(null)) c
 cross join lateral jsonb_array_elements(coalesce(c->'contacts','[]'::jsonb)) v;
 return result;
end;$$;
revoke all on function company_connector_private.contacts() from public,anon;
grant execute on function company_connector_private.contacts() to authenticated;
create function public.connector_contacts() returns jsonb language sql security invoker set search_path='' as $$select company_connector_private.contacts();$$;
revoke all on function public.connector_contacts() from public,anon;
grant execute on function public.connector_contacts() to authenticated;

create function company_connector_private.applications() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not company_connector_private.has_permission('applications') then raise exception 'Application access disabled' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'title',j.payload->'title','company',j.payload->'company',
 'location_label',j.payload->'location_label','url',j.payload->'url','status',j.status,'applied_at',j.applied_at)
 ||case when company_connector_private.has_permission('notes') then jsonb_build_object('notes',j.notes) else '{}'::jsonb end
 ||case when company_connector_private.has_permission('contacts') then jsonb_build_object('contact',j.payload->'contact','email',j.payload->'email','phone',j.payload->'phone') else '{}'::jsonb end
 order by j.updated_at desc),'[]'::jsonb) into result from public.jobs j
 where j.owner_id=auth.uid() and j.status in ('postulado','contactado','entrevista','oferta');
 return result;
end;$$;
revoke all on function company_connector_private.applications() from public,anon;
grant execute on function company_connector_private.applications() to authenticated;
create function public.connector_applications() returns jsonb language sql security invoker set search_path='' as $$select company_connector_private.applications();$$;
revoke all on function public.connector_applications() from public,anon;
grant execute on function public.connector_applications() to authenticated;

create function company_connector_private.profile_items(p_data jsonb,p_keys text[]) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_agg((select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from
  (select key k,case when jsonb_typeof(value)='array' then
   (select coalesce(jsonb_agg(t),'[]'::jsonb) from jsonb_array_elements(value) t where jsonb_typeof(t)='string') else value end v
   from jsonb_each(item) where key=any(p_keys) and jsonb_typeof(value)<>'object') fields)),'[]'::jsonb)
 from jsonb_array_elements(case when jsonb_typeof(p_data)='array' then p_data else '[]'::jsonb end) item
 where jsonb_typeof(item)='object';
$$;
revoke all on function company_connector_private.profile_items(jsonb,text[]) from public,anon;
grant execute on function company_connector_private.profile_items(jsonb,text[]) to authenticated;

create function company_connector_private.professional_profile() returns jsonb
language plpgsql security definer set search_path='' as $$
declare profile jsonb;
begin
 if not company_connector_private.has_permission('profile') then raise exception 'Profile access disabled' using errcode='42501';end if;
 select jsonb_build_object('headline',data->'headline','summary',data->'summary',
 'experience',company_connector_private.profile_items(data->'experience',array['role','company','start','end','ongoing','description','industry','employmentType','location','modality','tools']),'education',company_connector_private.profile_items(data->'education',array['title','institution','start','end','ongoing','kind']),'skills',data->'skills',
 'personalSkills',data->'personalSkills','skillEvidence',company_connector_private.profile_items(data->'skillEvidence',array['skill','context']),
 'languages',company_connector_private.profile_items(data->'languages',array['name','level']),'portfolio',company_connector_private.profile_items(data->'portfolio',array['title','url','description'])) into profile
 from public.candidate_profiles where owner_id=auth.uid();
 return profile;
end;$$;
revoke all on function company_connector_private.professional_profile() from public,anon;
grant execute on function company_connector_private.professional_profile() to authenticated;
create function public.connector_profile() returns jsonb language sql security invoker set search_path='' as $$select company_connector_private.professional_profile();$$;
revoke all on function public.connector_profile() from public,anon;
grant execute on function public.connector_profile() to authenticated;
-- Report guards are inserted below before commit, using the existing validated/locked implementation.

create or replace function company_connector_private.read_research(p_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not company_connector_private.has_permission('research_read') then raise exception 'Research access disabled' using errcode='42501';end if;
 if jsonb_array_length(company_connector_private.company_data_unfiltered_v1(p_id))<>1 or p_id is null then raise exception 'Company not found';end if;
 select jsonb_build_object('report',report,'updated_at',updated_at) into result from public.company_research where owner_id=auth.uid() and company_id=p_id;
 return result;
end;$$;

create or replace function company_connector_private.save_research(p_id text,p_report jsonb,p_expected_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_version timestamptz;result jsonb;item jsonb;key text;source_count integer;
begin
 if not company_connector_private.has_permission('research_write') then raise exception 'Research access disabled' using errcode='42501';end if;
 if not exists(select 1 from company_connector_private.active_session()) then raise exception 'Authentication required' using errcode='42501';end if;
 -- Lock the profile to serialize company deletion and concurrent first reports.
 perform 1 from public.candidate_profiles where owner_id=auth.uid() for update;
 if p_id is null or jsonb_array_length(company_connector_private.company_data_unfiltered_v1(p_id))<>1 then raise exception 'Company not found';end if;
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
commit;
