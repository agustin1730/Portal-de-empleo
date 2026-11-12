begin;
create table public.jobs (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'pendiente' check (status in ('pendiente','guardado','por_postular','postulado','entrevista','oferta','descartado')),
 notes text not null default '' check (char_length(notes)<=12000),
 applied_at date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (owner_id,id)
);
alter table public.jobs enable row level security;
revoke all on public.jobs from anon;
grant select,insert,update,delete on public.jobs to authenticated;
create policy jobs_owner_select on public.jobs for select to authenticated using ((select auth.uid())=owner_id);
create policy jobs_owner_insert on public.jobs for insert to authenticated with check ((select auth.uid())=owner_id);
create policy jobs_owner_update on public.jobs for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy jobs_owner_delete on public.jobs for delete to authenticated using ((select auth.uid())=owner_id);
create index jobs_owner_created on public.jobs(owner_id,created_at desc);
create function public.import_jobs(records jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item jsonb;added_count int:=0;updated_count int:=0;is_new boolean;seen_ids text[]:='{}';
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(records)<>'array' or jsonb_array_length(records)<1 or jsonb_array_length(records)>300 then raise exception 'Expected 1 to 300 jobs';end if;
 for item in select value from jsonb_array_elements(records) loop
  if item->>'id'=any(seen_ids) then continue;end if;
  seen_ids:=array_append(seen_ids,item->>'id');
  insert into public.jobs as current_job(owner_id,id,payload,status,notes,applied_at)
  values(auth.uid(),item->>'id',item->'payload',coalesce(item->>'status','pendiente'),coalesce(item->>'notes',''),nullif(item->>'applied_at','')::date)
  on conflict(owner_id,id) do update
   set payload=current_job.payload||excluded.payload,updated_at=now()
  returning (xmax=0) into is_new;
  if is_new then added_count:=added_count+1;else updated_count:=updated_count+1;end if;
 end loop;
 return jsonb_build_object('added',added_count,'updated',updated_count,'total',added_count+updated_count);
end;
$$;
revoke all on function public.import_jobs(jsonb) from public,anon;
grant execute on function public.import_jobs(jsonb) to authenticated;
commit;
