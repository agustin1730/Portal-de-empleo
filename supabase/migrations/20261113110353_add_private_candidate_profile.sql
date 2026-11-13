begin;
create table public.candidate_profiles (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object' and octet_length(data::text)<=200000),
 updated_at timestamptz not null default now()
);
create table public.candidate_files (
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('cv','photo','letter')),
 name text not null check(char_length(name)<=200),
 mime text not null,
 content text not null check(length(content)<=4194304),
 updated_at timestamptz not null default now(),
 primary key(owner_id,kind),
 check((kind='photo' and mime in ('image/jpeg','image/png')) or (kind in ('cv','letter') and mime='application/pdf'))
);
alter table public.candidate_profiles enable row level security;
alter table public.candidate_files enable row level security;
revoke all on public.candidate_profiles,public.candidate_files from anon;
grant select,insert,update,delete on public.candidate_profiles,public.candidate_files to authenticated;
create policy profile_owner on public.candidate_profiles for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy files_owner on public.candidate_files for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create function public.save_profile_section(patch jsonb) returns jsonb language sql security invoker set search_path='' as $$
 insert into public.candidate_profiles as p(owner_id,data) values(auth.uid(),patch)
 on conflict(owner_id) do update set data=p.data||excluded.data,updated_at=now()
 returning data;
$$;
revoke all on function public.save_profile_section(jsonb) from public,anon;
grant execute on function public.save_profile_section(jsonb) to authenticated;
commit;
